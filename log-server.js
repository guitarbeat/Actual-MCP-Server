import express from 'express';
const app = express();
app.use(express.json());

app.post('/log', (req, res) => {
  const { message } = req.body;
  const now = new Date().toISOString();
  console.log(`[${now}] LOG:`, message);
  res.sendStatus(200);
});

app.listen(4000, () => console.log('Log server listening on port 4000'));
