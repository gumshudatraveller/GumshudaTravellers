import { createApp } from "./app.js";
const { app, close } = await createApp();
const server = app.listen(Number(process.env.PORT) || 3001, "0.0.0.0", () =>
  console.log("Gumshuda Travellers API is ready."),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(() => {
      close();
      process.exit(0);
    }),
  );
