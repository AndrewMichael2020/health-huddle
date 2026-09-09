export function openConversation({signedUrl, initiation = {}, timeoutMs = 90000, WebSocketImpl = WebSocket, onEvent = () => {}, clientTools = {}}) {
  const socket = new WebSocketImpl(signedUrl);
  const events = [];
  const waiters = [];
  let closed = false;
  let conversationId = null;

  function deliver(event) {
    event._client_received_at = Date.now();
    events.push(event);
    if (process.env.HH_DEBUG === "1" && !new Set(["agent_chat_response_part","audio","ping"]).has(event.type)) process.stderr.write(`[elevenlabs] ${event.type}\n`);
    onEvent(event);
    for (const waiter of [...waiters]) {
      if (waiter.predicate(event)) {
        clearTimeout(waiter.timer);
        waiters.splice(waiters.indexOf(waiter), 1);
        waiter.resolve(event);
      }
    }
  }

  const opened = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("conversation WebSocket open timed out")), timeoutMs);
    socket.addEventListener("open", () => {
      clearTimeout(timer);
      socket.send(JSON.stringify({type:"conversation_initiation_client_data", ...initiation}));
      resolve();
    }, {once:true});
    socket.addEventListener("error", () => reject(new Error("conversation WebSocket error")), {once:true});
  });

  socket.addEventListener("message", (message) => {
    let event;
    try { event = JSON.parse(typeof message.data === "string" ? message.data : Buffer.from(message.data).toString("utf8")); }
    catch { return; }
    conversationId ||= event.conversation_initiation_metadata_event?.conversation_id ?? event.conversation_id ?? null;
    if (event.type === "ping") socket.send(JSON.stringify({type:"pong", event_id:event.ping_event.event_id}));
    if (event.type === "client_tool_call") {
      const call = event.client_tool_call;
      const handler = clientTools[call.tool_name];
      Promise.resolve(handler ? handler(call.parameters) : {error:`unsupported client tool: ${call.tool_name}`})
        .then((result) => socket.send(JSON.stringify({type:"client_tool_result", tool_call_id:call.tool_call_id, result:typeof result === "string" ? result : JSON.stringify(result), is_error:!handler})))
        .catch((error) => socket.send(JSON.stringify({type:"client_tool_result", tool_call_id:call.tool_call_id, result:error.message, is_error:true, error_type:"external_client"})));
    }
    deliver(event);
  });
  socket.addEventListener("close", () => {
    closed = true;
    deliver({type:"client_socket_closed"});
    for (const waiter of [...waiters]) {
      clearTimeout(waiter.timer);
      waiters.splice(waiters.indexOf(waiter), 1);
      waiter.reject(new Error("conversation socket closed before the awaited event"));
    }
  });

  function send(payload) {
    if (closed || socket.readyState !== WebSocketImpl.OPEN) throw new Error("conversation socket is not open");
    socket.send(JSON.stringify(payload));
  }
  function waitFor(predicate, waitMs = timeoutMs) {
    const existing = events.find(predicate);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      const waiter = {predicate, resolve, reject, timer:null};
      waiter.timer = setTimeout(() => {
        waiters.splice(waiters.indexOf(waiter), 1);
        reject(new Error("conversation event timed out"));
      }, waitMs);
      waiters.push(waiter);
    });
  }
  return {
    opened,
    events,
    get conversationId() { return conversationId; },
    sendUserMessage(text) { send({type:"user_message", text}); },
    sendUserActivity() { send({type:"user_activity"}); },
    sendContext(text, contextId = undefined) { send({type:"contextual_update", text, ...(contextId ? {context_id:contextId} : {})}); },
    sendClientToolResult(toolCallId, result, isError = false) { send({type:"client_tool_result", tool_call_id:toolCallId, result:typeof result === "string" ? result : JSON.stringify(result), is_error:isError}); },
    waitFor,
    close() { if (!closed) socket.close(1000, "complete"); }
  };
}
