
import { GoogleGenAI, Type } from "@google/genai";
import { PlantInfo, WeatherInfo } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const plantInfoSchema = {
  type: Type.OBJECT,
  properties: {
    tenThuongGoi: { type: Type.STRING, description: "Tên thường gọi của cây." },
    tenKhoaHoc: { type: Type.STRING, description: "Tên khoa học của cây." },
    nguonGoc: { type: Type.STRING, description: "Nguồn gốc, xuất xứ của cây." },
    moTaNgan: { type: Type.STRING, description: "Mô tả ngắn gọn về cây." },
    tinhTrangSucKhoe: {
      type: Type.OBJECT,
      description: "Phân tích tình trạng sức khỏe của cây trong ảnh.",
      properties: {
        trangThai: {
          type: Type.STRING,
          enum: ['Khỏe mạnh', 'Lá vàng', 'Sâu bệnh', 'Thiếu nước', 'Khác'],
          description: "Trạng thái sức khỏe tổng quát."
        },
        moTaChiTiet: {
          type: Type.STRING,
          description: "Mô tả chi tiết các dấu hiệu quan sát được."
        }
      },
      required: ['trangThai', 'moTaChiTiet']
    },
    dacDiemSinhHoc: { type: Type.STRING, description: "Các đặc điểm sinh học nổi bật của cây." },
    dieuKienSong: {
      type: Type.OBJECT,
      description: "Điều kiện sống lý tưởng cho cây.",
      properties: {
        anhSang: { type: Type.STRING },
        datTrong: { type: Type.STRING },
        doAm: { type: Type.STRING },
        nhietDo: { type: Type.STRING }
      },
      required: ['anhSang', 'datTrong', 'doAm', 'nhietDo']
    },
    huongDanChamSoc: {
      type: Type.OBJECT,
      description: "Hướng dẫn chi tiết cách chăm sóc cây.",
      properties: {
        tuoiNuoc: { type: Type.STRING },
        bonPhan: { type: Type.STRING },
        thayChau: { type: Type.STRING },
        canhBao: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      required: ['tuoiNuoc', 'bonPhan', 'thayChau', 'canhBao']
    },
    benhThuongGap: {
      type: Type.ARRAY,
      description: "Các bệnh thường gặp ở cây và cách xử lý.",
      items: {
        type: Type.OBJECT,
        properties: {
          tenBenh: { type: Type.STRING },
          trieuChung: { type: Type.STRING },
          cachXuLy: { type: Type.STRING }
        },
        required: ['tenBenh', 'trieuChung', 'cachXuLy']
      }
    }
  },
  required: ['tenThuongGoi', 'tenKhoaHoc', 'nguonGoc', 'moTaNgan', 'tinhTrangSucKhoe', 'dacDiemSinhHoc', 'dieuKienSong', 'huongDanChamSoc', 'benhThuongGap']
};

const callGeminiWithSchema = async (prompt: string, imageBase64?: string): Promise<PlantInfo> => {
    const textPart = { text: prompt };
    const parts: ({ text: string; } | { inlineData: { mimeType: string; data: string; }; })[] = [textPart];
    if (imageBase64) {
        const imagePart = {
            inlineData: {
                mimeType: 'image/jpeg',
                data: imageBase64,
            },
        };
        parts.unshift(imagePart);
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: {
            responseMimeType: 'application/json',
            responseSchema: plantInfoSchema,
        },
    });
    
    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as PlantInfo;
    } catch (e) {
        console.error("Failed to parse JSON from Gemini:", response.text);
        throw new Error("Không thể phân tích dữ liệu từ AI. Vui lòng thử lại.");
    }
};

export const identifyPlant = async (imageBase64: string): Promise<PlantInfo> => {
    const prompt = "Dựa vào hình ảnh này, hãy nhận diện cây, phân tích tình trạng sức khỏe của nó, và cung cấp thông tin chi tiết. Chỉ trả về JSON.";
    return callGeminiWithSchema(prompt, imageBase64);
};

export const searchPlantByName = async (plantName: string): Promise<PlantInfo> => {
    const prompt = `Cung cấp thông tin chi tiết về cây có tên "${plantName}". Không cần phân tích sức khỏe. Chỉ trả về JSON.`;
    const plantInfo = await callGeminiWithSchema(prompt);
    // When searching by name, health status is not applicable, so we set a default
    plantInfo.tinhTrangSucKhoe = {
        trangThai: 'Khác',
        moTaChiTiet: 'Thông tin sức khỏe không áp dụng cho tìm kiếm theo tên.'
    };
    return plantInfo;
};

const weatherInfoSchema = {
  type: Type.OBJECT,
  properties: {
    temperature: { type: Type.NUMBER, description: "Nhiệt độ hiện tại bằng độ C." },
    humidity: { type: Type.NUMBER, description: "Độ ẩm hiện tại (%)." },
    condition: { type: Type.STRING, description: "Mô tả ngắn gọn về tình trạng thời tiết (VD: Nắng nhẹ, Mây rải rác, Mưa rào)." },
    icon: {
      type: Type.STRING,
      enum: ['sun', 'cloud-sun', 'cloud', 'rain', 'bolt', 'snow'],
      description: "Một biểu tượng đại diện cho thời tiết."
    }
  },
  required: ['temperature', 'humidity', 'condition', 'icon']
};

export const getWeatherInfo = async (lat: number, lon: number): Promise<WeatherInfo> => {
    const prompt = `Dựa vào tọa độ vĩ độ ${lat} và kinh độ ${lon}, hãy cung cấp thông tin thời tiết hiện tại. Chỉ trả về JSON.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: weatherInfoSchema,
        },
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as WeatherInfo;
    } catch (e) {
        console.error("Failed to parse weather JSON from Gemini:", response.text);
        throw new Error("Không thể lấy dữ liệu thời tiết.");
    }
};

export const getWeatherBasedTip = async (weather: WeatherInfo, plantNames: string[]): Promise<string> => {
    const weatherString = `Nhiệt độ: ${weather.temperature}°C, Độ ẩm: ${weather.humidity}%, Tình trạng: ${weather.condition}`;
    const plantsString = plantNames.length > 0 ? `Danh sách cây trong vườn gồm: ${plantNames.join(', ')}.` : "Hiện chưa có cây nào trong vườn.";

    const prompt = `Bạn là một chuyên gia làm vườn thông thái. Dựa vào thông tin thời tiết hôm nay: ${weatherString}. ${plantsString} Hãy đưa ra một mẹo chăm sóc ngắn gọn (không quá 30 từ), hữu ích và độc đáo cho ngày hôm nay. Mẹo nên cụ thể và liên quan trực tiếp đến điều kiện thời tiết và các loại cây nếu có. Ví dụ: "Trời nắng gắt, hãy che mát cho cây lan của bạn!" hoặc "Hôm nay trời ẩm, hãy kiểm tra nấm mốc trên cây hoa hồng."`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    return response.text;
};
