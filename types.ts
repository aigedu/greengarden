export interface PlantInfo {
  tenThuongGoi: string;
  tenKhoaHoc: string;
  nguonGoc: string;
  moTaNgan: string;
  tinhTrangSucKhoe: {
    trangThai: 'Khỏe mạnh' | 'Lá vàng' | 'Sâu bệnh' | 'Thiếu nước' | 'Khác';
    moTaChiTiet: string;
  };
  dacDiemSinhHoc: string;
  dieuKienSong: {
    anhSang: string;
    datTrong: string;
    doAm: string;
    nhietDo: string;
  };
  huongDanChamSoc: {
    tuoiNuoc: string;
    bonPhan: string;
    thayChau: string;
    canhBao: string[];
  };
  benhThuongGap: {
    tenBenh: string;
    trieuChung: string;
    cachXuLy: string;
  }[];
}

export interface GrowthLogEntry {
  id: number;
  image: string;
  note: string;
  date: string;
}

export type PlantCategory = 'Cây bóng mát' | 'Cây hoa' | 'Cây ăn quả' | 'Cây mọng nước' | 'Khác';

export type CareActivityType = 'Tưới nước' | 'Bón phân' | 'Diệt sâu bệnh' | 'Cắt tỉa' | 'Khác';

export interface CareLogEntry {
  id: number;
  activity: CareActivityType;
  date: string; // ISO string format
  notes?: string;
}

export interface MyPlant {
  id: number;
  name: string;
  image: string; // base64
  description: string;
  category: PlantCategory;
  careLog?: CareLogEntry[];
}

export interface Reminder {
  id: number;
  title: string;
  plantId: number | 'all';
  activity: CareActivityType;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  daysOfWeek?: number[]; // 0 for Sun, 1 for Mon, etc.
  dayOfMonth?: number; // 1-31
  date?: string; // YYYY-MM-DD
  time: string; // HH:MM
  isEnabled: boolean;
}

export interface WeatherInfo {
  temperature: number;
  humidity: number;
  condition: string;
  icon: string; // 'sun', 'cloud-sun', 'cloud', 'rain', 'bolt', 'snow'
}