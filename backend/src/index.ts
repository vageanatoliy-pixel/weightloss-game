import { app } from './app.js';
import { config } from './config.js';

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend running on :${config.port}`);
});
