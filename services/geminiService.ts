import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const generateGameOverMessage = async (score: number, maxCombo: number): Promise<string> => {
  const client = getClient();
  if (!client) {
    return "牛局长说：你被解雇了！(未配置 API Key)";
  }

  try {
    const prompt = `
      你现在是《疯狂动物城》里的牛局长 (Chief Bogo)。
      玩家是一名电影院保安，任务是阻止观众在《疯狂动物城2》首映礼上非法盗摄。
      游戏结束了。
      玩家得分: ${score}.
      
      请写一段非常简短的、8-bit 街机风格的“游戏结束”评价 (最多2句话)。
      请使用中文回答。
      
      如果分数很低 (<500)，严厉地批评他们（比如“简直是灾难”）。
      如果分数中等 (500-1500)，给出一个勉强的认可。
      如果分数很高 (>1500)，虽然依然保持严肃硬汉形象，但要表扬他们干得不错。
      
      不要包含引号。
    `;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "游戏结束";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "任务失败。请重试。";
  }
};
