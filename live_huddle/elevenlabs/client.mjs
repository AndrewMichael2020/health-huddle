const API_BASE = "https://api.elevenlabs.io";

export class ElevenLabsClient {
  constructor({apiKey = process.env.ELEVENLABS_KEY, fetchImpl = fetch} = {}) {
    if (!apiKey) throw new Error("ELEVENLABS_KEY is not loaded");
    this.apiKey = apiKey;
    this.fetch = fetchImpl;
  }

  async request(method, pathname, {body, query} = {}) {
    const url = new URL(pathname, API_BASE);
    for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, String(value));
    const response = await this.fetch(url, {
      method,
      headers:{"xi-api-key":this.apiKey, ...(body ? {"content-type":"application/json"} : {})},
      body:body ? JSON.stringify(body) : undefined
    });
    const text = await response.text();
    let payload = null;
    if (text) {
      try { payload = JSON.parse(text); } catch { payload = text; }
    }
    if (!response.ok) throw new Error(`ElevenLabs ${method} ${pathname} failed (${response.status}): ${typeof payload === "string" ? payload.slice(0, 500) : JSON.stringify(payload).slice(0, 500)}`);
    return payload;
  }

  async requestBytes(method, pathname, {body, query} = {}) {
    const url = new URL(pathname, API_BASE);
    for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, String(value));
    const response = await this.fetch(url, {method, headers:{"xi-api-key":this.apiKey, ...(body ? {"content-type":"application/json"} : {})}, body:body ? JSON.stringify(body) : undefined});
    if (!response.ok) throw new Error(`ElevenLabs ${method} ${pathname} failed (${response.status})`);
    return Buffer.from(await response.arrayBuffer());
  }

  get(pathname, options) { return this.request("GET", pathname, options); }
  post(pathname, body, options = {}) { return this.request("POST", pathname, {...options, body}); }
  patch(pathname, body, options = {}) { return this.request("PATCH", pathname, {...options, body}); }

  listAgents() { return this.get("/v1/convai/agents", {query:{page_size:100}}); }
  listKnowledge() { return this.get("/v1/convai/knowledge-base", {query:{page_size:100}}); }
  listTools() { return this.get("/v1/convai/tools", {query:{page_size:100}}); }
  createTool(toolConfig) { return this.post("/v1/convai/tools", {tool_config:toolConfig}); }
  createKnowledgeText(name, text) { return this.post("/v1/convai/knowledge-base/text", {name, text}); }
  createAgent(body) { return this.post("/v1/convai/agents/create", body); }
  updateAgent(agentId, body) { return this.patch(`/v1/convai/agents/${agentId}`, body); }
  getAgent(agentId) { return this.get(`/v1/convai/agents/${agentId}`); }
  getConversation(conversationId) { return this.get(`/v1/convai/conversations/${conversationId}`); }
  getConversationAudio(conversationId) { return this.requestBytes("GET", `/v1/convai/conversations/${conversationId}/audio`); }
  textToSpeechMp3(voiceId, text, {modelId = "eleven_turbo_v2"} = {}) {
    return this.requestBytes("POST", `/v1/text-to-speech/${voiceId}`, {query:{output_format:"mp3_44100_128"}, body:{text,model_id:modelId,voice_settings:{stability:0.56,similarity_boost:0.76,speed:1.2}}});
  }
  getSignedUrl(agentId, {includeConversationId = true} = {}) {
    return this.get("/v1/convai/conversation/get-signed-url", {query:{agent_id:agentId, include_conversation_id:includeConversationId}});
  }
}
