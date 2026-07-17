import { EventEmitter } from "events";

const sseEmitter = new EventEmitter();
sseEmitter.setMaxListeners(0);

export const handleSseConnection = (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Send initial establish packet
  res.write(": ok\n\n");

  const onUpdate = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data || {})}\n\n`);
  };

  sseEmitter.on("update", onUpdate);

  // Send ping every 25 seconds to keep connection alive
  const interval = setInterval(() => {
    res.write(": ping\n\n");
  }, 25000);

  req.on("close", () => {
    clearInterval(interval);
    sseEmitter.off("update", onUpdate);
  });
};

export const broadcastUpdate = (event, data = {}) => {
  sseEmitter.emit("update", event, data);
};

export const attachSseMiddleware = (schema, events) => {
  const eventList = Array.isArray(events) ? events : [events];
  const notify = () => {
    try {
      eventList.forEach(eventName => {
        broadcastUpdate(eventName);
      });
    } catch (err) {
      console.error("Error broadcasting updates:", err);
    }
  };

  schema.post("save", notify);
  schema.post("findOneAndUpdate", notify);
  schema.post("updateOne", notify);
  schema.post("updateMany", notify);
  schema.post("deleteOne", notify);
};
