export default function handler(req: any, res: any) {
  res.status(200).json({
    status: "healthy",
    keyConfigured: !!process.env.GEMINI_API_KEY
  });
}
