import { app } from "./app";
import { initDb } from "./db/init";

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
  });
}

bootstrap();
