export default async function handler(req, res) {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
  if (!token) {
    res.status(200).json({
      connected: false,
      username: null,
      firstName: null,
    });
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const payload = await response.json();
    if (!response.ok || !payload?.ok || !payload?.result) {
      res.status(200).json({
        connected: false,
        username: null,
        firstName: null,
      });
      return;
    }

    res.status(200).json({
      connected: true,
      username: payload.result.username ?? null,
      firstName: payload.result.first_name ?? null,
    });
  } catch {
    res.status(200).json({
      connected: false,
      username: null,
      firstName: null,
    });
  }
}
