
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { identifyPlant, searchPlantByName, getWeatherInfo, getWeatherBasedTip } from './services/geminiService';
import { PlantInfo, GrowthLogEntry, MyPlant, PlantCategory, CareLogEntry, CareActivityType, Reminder, WeatherInfo } from './types';
import Loader from './components/Loader';
// Fix: Changed PuzzleIcon to PuzzlePieceIcon to match the exported component name.
import { LeafIcon, SunIcon, WaterDropIcon, SoilIcon, TemperatureIcon, FertilizerIcon, PotIcon, BugIcon, WarningIcon, CameraIcon, UploadIcon, SearchIcon, BackIcon, CalendarIcon, NoteIcon, BookIcon, HealthIcon, GardenIcon, PlusIcon, PruningIcon, JournalIcon, EditIcon, TrashIcon, BellIcon, GamepadIcon, AppleIcon, DotIcon, PuzzlePieceIcon, QuestionIcon, ThumbsUpIcon, ThumbsDownIcon, CheckCircleIcon, TimesCircleIcon, CloudSunIcon, CloudIcon, CloudRainIcon, BoltIcon, SnowIcon, LightbulbIcon } from './components/icons';

type View = 'home' | 'result' | 'search_by_name' | 'my_garden' | 'add_plant' | 'plant_detail' | 'reminders' | 'game_menu' | 'game_sequencing' | 'game_quiz' | 'game_matching' | 'game_true_false';

const PLANT_CATEGORIES: PlantCategory[] = ['Cây bóng mát', 'Cây hoa', 'Cây ăn quả', 'Cây mọng nước', 'Khác'];
const CARE_ACTIVITIES: CareActivityType[] = ['Tưới nước', 'Bón phân', 'Diệt sâu bệnh', 'Cắt tỉa', 'Khác'];
const DAYS_OF_WEEK = [
    { label: 'CN', value: 0 },
    { label: 'T2', value: 1 },
    { label: 'T3', value: 2 },
    { label: 'T4', value: 3 },
    { label: 'T5', value: 4 },
    { label: 'T6', value: 5 },
    { label: 'T7', value: 6 },
];


// --- Helper Functions ---

const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'Khỏe mạnh': return 'text-green-500';
      case 'Lá vàng': return 'text-yellow-500';
      case 'Sâu bệnh': return 'text-red-500';
      case 'Thiếu nước': return 'text-blue-500';
      default: return 'text-gray-500';
    }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const shuffleArray = (array: any[]) => {
    return [...array].sort(() => Math.random() - 0.5);
};


// --- Component Definitions ---

const ReminderPopup = ({ reminder, plantName, onClose }: { reminder: Reminder, plantName: string, onClose: () => void }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 relative animate-shake border-t-4 border-green-500">
            <div className="flex flex-col items-center text-center">
                <div className="bg-green-100 p-4 rounded-full mb-4">
                    <BellIcon className="w-8 h-8 text-green-600 animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{reminder.title}</h3>
                <p className="text-gray-600 mb-4">
                    Đã đến giờ <strong>{reminder.activity.toLowerCase()}</strong> cho <span className="font-semibold text-green-700">{plantName}</span>!
                </p>
                <div className="text-sm text-gray-500 mb-6 flex items-center justify-center bg-gray-100 px-3 py-1 rounded-full">
                    <i className="fa-regular fa-clock mr-2"></i> {reminder.time}
                </div>
                <button 
                    onClick={onClose}
                    className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition transform active:scale-95"
                >
                    Đã hiểu
                </button>
            </div>
        </div>
    </div>
);

const WeatherWidget = ({ weather, tip, isLoading }: { weather: WeatherInfo | null; tip: string | null; isLoading: boolean; }) => {
    if (isLoading) {
        return (
            <div className="w-full bg-white rounded-lg shadow p-4 mb-8 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
        );
    }

    if (!weather) {
        return null;
    }

    const getWeatherIcon = (icon: string) => {
        const props = { className: "text-5xl" };
        switch(icon) {
            case 'sun': return <SunIcon {...props} />;
            case 'cloud-sun': return <CloudSunIcon {...props} />;
            case 'cloud': return <CloudIcon {...props} />;
            case 'rain': return <CloudRainIcon {...props} />;
            case 'bolt': return <BoltIcon {...props} />;
            case 'snow': return <SnowIcon {...props} />;
            default: return <CloudIcon {...props} />;
        }
    }

    return (
        <div className="w-full bg-gradient-to-br from-blue-400 to-cyan-400 text-white rounded-lg shadow-lg p-5 mb-8 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="font-bold text-xl">Thời tiết hôm nay</h3>
                    <p className="text-3xl font-extrabold">{Math.round(weather.temperature)}°C</p>
                    <p className="opacity-90">{weather.condition}</p>
                </div>
                <div className="text-yellow-300">
                   {getWeatherIcon(weather.icon)}
                </div>
            </div>
            {tip && (
                <div className="bg-white/30 rounded-md p-3">
                    <p className="font-semibold text-sm flex items-center">
                        <LightbulbIcon className="w-4 h-4 mr-2 text-yellow-300" />
                        Mẹo trong ngày:
                    </p>
                    <p className="text-sm mt-1">{tip}</p>
                </div>
            )}
        </div>
    );
};


const InfoCard = ({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) => (
  <div className="bg-white rounded-lg shadow p-4">
    <h3 className="text-lg font-semibold text-green-800 mb-2 flex items-center"><span className="mr-2">{icon}</span>{title}</h3>
    <div className="text-gray-600 space-y-2 text-sm">{children}</div>
  </div>
);

type HeaderProps = {
    view: View;
    onBackClick: () => void;
}
const Header = ({ view, onBackClick }: HeaderProps) => (
    <header className="bg-white shadow-md w-full sticky top-0 z-20">
      <div className="container mx-auto p-4 flex justify-center items-center relative">
        {view !== 'home' && (
          <button onClick={onBackClick} className="absolute left-4 text-green-600 hover:text-green-800 transition">
            <BackIcon className="w-6 h-6" />
          </button>
        )}
        <div className="flex items-center space-x-2">
          <LeafIcon className="w-8 h-8 text-green-600" />
          <h1 className="text-2xl font-bold text-green-800">GreenGarden</h1>
        </div>
      </div>
    </header>
);

type HomeViewProps = {
    error: string | null;
    onUploadClick: () => void;
    onSearchClick: () => void;
    onMyGardenClick: () => void;
    onRemindersClick: () => void;
    onGameClick: () => void;
    weatherInfo: WeatherInfo | null;
    weatherTip: string | null;
    isWeatherLoading: boolean;
    plantCount: number;
}
const HomeView = ({ error, onUploadClick, onSearchClick, onMyGardenClick, onRemindersClick, onGameClick, weatherInfo, weatherTip, isWeatherLoading, plantCount }: HomeViewProps) => (
    <div className="text-center p-4 md:p-8 flex flex-col items-center justify-center flex-grow">
      <WeatherWidget weather={weatherInfo} tip={weatherTip} isLoading={isWeatherLoading} />
      <h2 className="text-3xl font-bold text-gray-700 mb-2">Trợ lý cây xanh thông minh</h2>
      <p className="text-gray-500 mb-8 max-w-md">Chụp ảnh, tìm kiếm tên, hoặc quản lý khu vườn của bạn.</p>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
      <div className="w-full max-w-lg space-y-4">
        <button
          onClick={onUploadClick}
          className="w-full bg-green-600 text-white font-bold py-4 px-4 rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105 flex items-center justify-center space-x-3 text-lg"
        >
          <CameraIcon className="w-6 h-6" />
          <span>Nhận diện cây qua ảnh</span>
        </button>
        <button
          onClick={onSearchClick}
          className="w-full bg-white text-green-600 border-2 border-green-600 font-bold py-4 px-4 rounded-lg hover:bg-green-50 transition-transform transform hover:scale-105 flex items-center justify-center space-x-3 text-lg"
        >
          <SearchIcon className="w-6 h-6" />
          <span>Tìm kiếm cây theo tên</span>
        </button>
        <button
          onClick={onMyGardenClick}
          className={`w-full bg-white text-green-600 border-2 border-green-600 font-bold py-4 px-4 rounded-lg hover:bg-green-50 transition-transform transform hover:scale-105 flex items-center ${plantCount > 0 ? 'justify-between' : 'justify-center'} text-lg`}
        >
          <div className="flex items-center space-x-3">
            <GardenIcon className="w-6 h-6" />
            <span>Khu vườn của tôi</span>
          </div>
          {plantCount > 0 && (
            <span className="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">{plantCount} cây</span>
          )}
        </button>
        <button
          onClick={onRemindersClick}
          className="w-full bg-white text-green-600 border-2 border-green-600 font-bold py-4 px-4 rounded-lg hover:bg-green-50 transition-transform transform hover:scale-105 flex items-center justify-center space-x-3 text-lg"
        >
          <BellIcon className="w-6 h-6" />
          <span>Quản lý nhắc nhở</span>
        </button>
         <button
          onClick={onGameClick}
          className="w-full bg-orange-500 text-white font-bold py-4 px-4 rounded-lg hover:bg-orange-600 transition-transform transform hover:scale-105 flex items-center justify-center space-x-3 text-lg"
        >
          <GamepadIcon className="w-6 h-6" />
          <span>Trò chơi khoa học</span>
        </button>
      </div>
    </div>
);

type SearchByNameViewProps = {
    error: string | null;
    searchQuery: string;
    onSearchQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSearch: () => void;
}
const SearchByNameView = ({ error, searchQuery, onSearchQueryChange, onSearch }: SearchByNameViewProps) => (
    <div className="text-center p-8 flex flex-col items-center justify-center flex-grow">
       <h2 className="text-3xl font-bold text-gray-700 mb-2">Tìm kiếm thông tin cây</h2>
       <p className="text-gray-500 mb-8 max-w-md">Nhập tên cây bạn muốn tra cứu.</p>
       {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
       <div className="w-full max-w-md flex space-x-2">
          <input 
            type="text"
            value={searchQuery}
            onChange={onSearchQueryChange}
            onKeyPress={(e) => e.key === 'Enter' && onSearch()}
            placeholder="Ví dụ: Cây trầu bà"
            className="flex-grow p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
          />
          <button
            onClick={onSearch}
            className="bg-green-600 text-white font-bold py-3 px-5 rounded-lg hover:bg-green-700 transition"
          >
            <SearchIcon className="w-5 h-5"/>
          </button>
       </div>
    </div>
);

type ResultViewProps = {
    plantInfo: PlantInfo;
    plantImage: string | null;
    growthLog: GrowthLogEntry[];
    newLogNote: string;
    onNewLogNoteChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onAddLog: () => void;
    onAddToGarden: () => void;
}
const ResultView = ({ plantInfo, plantImage, growthLog, newLogNote, onNewLogNoteChange, onAddLog, onAddToGarden }: ResultViewProps) => {
    const [activeTab, setActiveTab] = useState('info');
    
    return (
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 flex flex-col lg:flex-row gap-6">
          {plantImage && (
            <div className="lg:w-1/3">
              <img src={plantImage} alt={plantInfo.tenThuongGoi} className="rounded-lg w-full h-auto object-cover aspect-square" />
            </div>
          )}
          <div className="lg:w-2/3">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">{plantInfo.tenThuongGoi}</h2>
            <p className="text-md md:text-lg text-gray-500 italic mb-4">{plantInfo.tenKhoaHoc}</p>
            <p className="text-gray-600 mb-4">{plantInfo.moTaNgan}</p>
            <div className={`p-4 rounded-lg ${getHealthStatusColor(plantInfo.tinhTrangSucKhoe.trangThai).replace('text', 'bg').replace('500', '100')}`}>
              <h3 className={`text-lg font-semibold ${getHealthStatusColor(plantInfo.tinhTrangSucKhoe.trangThai)} flex items-center`}>
                <HealthIcon className="w-5 h-5 mr-2"/> Tình trạng sức khỏe: {plantInfo.tinhTrangSucKhoe.trangThai}
              </h3>
              <p className="text-gray-700 mt-1">{plantInfo.tinhTrangSucKhoe.moTaChiTiet}</p>
            </div>
            <button onClick={onAddToGarden} className="mt-4 w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105 flex items-center justify-center space-x-3 text-lg">
              <GardenIcon className="w-6 h-6" />
              <span>Thêm vào khu vườn</span>
            </button>
          </div>
        </div>

        <div className="sticky top-[72px] bg-green-50 py-2 z-10">
          <div className="flex justify-center bg-green-100 rounded-full p-1 max-w-lg mx-auto shadow">
            <button onClick={() => setActiveTab('info')} className={`px-4 py-2 rounded-full font-semibold transition w-1/2 ${activeTab === 'info' ? 'bg-green-600 text-white' : 'text-green-700'}`}>Thông tin & Chăm sóc</button>
            <button onClick={() => setActiveTab('tracker')} className={`px-4 py-2 rounded-full font-semibold transition w-1/2 ${activeTab === 'tracker' ? 'bg-green-600 text-white' : 'text-green-700'}`}>Theo dõi & Bệnh</button>
          </div>
        </div>

        {activeTab === 'info' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 animate-fade-in">
             <InfoCard icon={<BookIcon/>} title="Thông tin chung">
              <p><strong>Nguồn gốc:</strong> {plantInfo.nguonGoc}</p>
              <p><strong>Đặc điểm:</strong> {plantInfo.dacDiemSinhHoc}</p>
             </InfoCard>
             <InfoCard icon={<SunIcon/>} title="Điều kiện sống">
                <p><strong className="inline-flex items-center"><SunIcon className="mr-2 text-yellow-500"/>Ánh sáng:</strong> {plantInfo.dieuKienSong.anhSang}</p>
                <p><strong className="inline-flex items-center"><SoilIcon className="mr-2 text-amber-700"/>Đất trồng:</strong> {plantInfo.dieuKienSong.datTrong}</p>
                <p><strong className="inline-flex items-center"><WaterDropIcon className="mr-2 text-blue-500"/>Độ ẩm:</strong> {plantInfo.dieuKienSong.doAm}</p>
                <p><strong className="inline-flex items-center"><TemperatureIcon className="mr-2 text-red-500"/>Nhiệt độ:</strong> {plantInfo.dieuKienSong.nhietDo}</p>
             </InfoCard>
             <InfoCard icon={<CalendarIcon/>} title="Hướng dẫn chăm sóc">
                <p><strong className="inline-flex items-center"><WaterDropIcon className="mr-2 text-blue-500"/>Tưới nước:</strong> {plantInfo.huongDanChamSoc.tuoiNuoc}</p>
                <p><strong className="inline-flex items-center"><FertilizerIcon className="mr-2 text-green-500"/>Bón phân:</strong> {plantInfo.huongDanChamSoc.bonPhan}</p>
                <p><strong className="inline-flex items-center"><PotIcon className="mr-2 text-orange-500"/>Thay chậu:</strong> {plantInfo.huongDanChamSoc.thayChau}</p>
             </InfoCard>
             <InfoCard icon={<WarningIcon className="text-yellow-500"/>} title="Cảnh báo">
                {plantInfo.huongDanChamSoc.canhBao.length > 0 ? (
                  <ul className="list-disc list-inside">
                    {plantInfo.huongDanChamSoc.canhBao.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                ) : <p>Không có cảnh báo đặc biệt.</p>}
             </InfoCard>
          </div>
        )}
        
        {activeTab === 'tracker' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 animate-fade-in">
             <InfoCard icon={<BugIcon className="text-red-500"/>} title="Các bệnh thường gặp">
              {plantInfo.benhThuongGap.length > 0 ? (
                <div className="space-y-3">
                  {plantInfo.benhThuongGap.map((benh, i) => (
                    <div key={i} className="border-l-4 border-red-300 pl-3">
                      <p className="font-semibold">{benh.tenBenh}</p>
                      <p><strong>Triệu chứng:</strong> {benh.trieuChung}</p>
                      <p><strong>Cách xử lý:</strong> {benh.cachXuLy}</p>
                    </div>
                  ))}
                </div>
              ) : <p>Cây này ít gặp sâu bệnh.</p>}
             </InfoCard>
             
             <InfoCard icon={<NoteIcon className="text-blue-500"/>} title="Theo dõi phát triển">
              {plantImage && (
                <div className="space-y-2">
                  <textarea 
                    value={newLogNote}
                    onChange={onNewLogNoteChange}
                    placeholder="Ghi chú về sự phát triển của cây hôm nay..."
                    className="w-full p-2 border rounded-md"
                    rows={3}
                  />
                  <button onClick={onAddLog} className="w-full bg-blue-500 text-white font-semibold py-2 rounded-md hover:bg-blue-600">Lưu ghi chú</button>
                </div>
              )}
              <div className="mt-4 space-y-4 max-h-60 overflow-y-auto pr-2">
                {growthLog.length > 0 ? (
                  growthLog.map(log => (
                    <div key={log.id} className="flex gap-3 border-b pb-2">
                      <img src={log.image} alt="log" className="w-16 h-16 rounded-md object-cover"/>
                      <div>
                        <p className="font-semibold text-xs text-gray-500">{log.date}</p>
                        <p>{log.note}</p>
                      </div>
                    </div>
                  ))
                ) : <p className="text-gray-500 text-center">Chưa có ghi chú nào.</p>}
              </div>
            </InfoCard>
          </div>
        )}
      </div>
    );
};

type MyGardenViewProps = {
    plants: MyPlant[];
    onAddPlant: () => void;
    onSelectPlant: (plant: MyPlant) => void;
    onDeletePlant: (plant: MyPlant) => void;
    searchTerm: string;
    onSearchTermChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    filterCategory: PlantCategory | 'all';
    onFilterCategoryChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
};
const MyGardenView = ({ plants, onAddPlant, onSelectPlant, onDeletePlant, searchTerm, onSearchTermChange, filterCategory, onFilterCategoryChange }: MyGardenViewProps) => (
    <div className="p-4 md:p-6 relative min-h-[calc(100vh-150px)]">
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <h2 className="text-2xl font-bold text-gray-700 mb-4">Khu vườn của tôi</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <input 
            type="text"
            value={searchTerm}
            onChange={onSearchTermChange}
            placeholder="Tìm kiếm cây trong vườn..."
            className="flex-grow p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
          />
          <select 
            value={filterCategory}
            onChange={onFilterCategoryChange}
            className="p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
          >
            <option value="all">Tất cả các loại</option>
            {PLANT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      {plants.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {plants.map(plant => (
            <div key={plant.id} className="bg-white rounded-lg shadow-md overflow-hidden group transition-transform transform hover:-translate-y-1 text-left">
              <button onClick={() => onSelectPlant(plant)} className="w-full block text-left focus:outline-none focus:ring-2 focus:ring-green-500 rounded-t-lg">
                <img src={plant.image} alt={plant.name} className="w-full h-40 object-cover" />
                <div className="p-3">
                  <h3 className="font-bold text-gray-800 truncate">{plant.name}</h3>
                </div>
              </button>
              <div className="px-3 pb-3 -mt-2 flex justify-between items-center">
                <p className="text-sm text-gray-500">{plant.category}</p>
                <button
                    onClick={() => onDeletePlant(plant)}
                    className="text-gray-400 hover:text-red-600 transition p-1 rounded-full hover:bg-red-50"
                    aria-label={`Xóa ${plant.name}`}
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">Khu vườn của bạn chưa có cây nào.</p>
          <button onClick={onAddPlant} className="bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition">
            Thêm cây đầu tiên
          </button>
        </div>
      )}

      <button
        onClick={onAddPlant}
        className="fixed bottom-8 right-8 bg-green-600 text-white w-16 h-16 rounded-full shadow-lg hover:bg-green-700 transition-transform transform hover:scale-110 flex items-center justify-center z-30"
        aria-label="Thêm cây mới"
      >
        <PlusIcon className="w-8 h-8"/>
      </button>
    </div>
);

type AddPlantViewProps = {
    onSave: (plant: Omit<MyPlant, 'id'>) => void;
    initialData?: { name: string; description: string; image: string | null; } | null;
};
const AddPlantView = ({ onSave, initialData }: AddPlantViewProps) => {
    const [name, setName] = useState(initialData?.name || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [category, setCategory] = useState<PlantCategory>('Khác');
    const [image, setImage] = useState<string | null>(initialData?.image || null);
    const [error, setError] = useState('');
    const addPlantFileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const base64 = await fileToBase64(file);
            setImage(base64);
        }
    };

    const handleSave = () => {
        if (!name.trim() || !image) {
            setError('Vui lòng nhập tên cây và tải lên một hình ảnh.');
            return;
        }
        onSave({ name, description, category, image });
    };

    return (
        <div className="p-4 md:p-6">
            <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
                <h2 className="text-2xl font-bold text-gray-700 mb-6">Thêm cây mới vào vườn</h2>
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
                <div className="space-y-4">
                    <input type="file" accept="image/*" ref={addPlantFileInputRef} onChange={handleImageChange} className="hidden" />
                    <button onClick={() => addPlantFileInputRef.current?.click()} className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50">
                        {image ? (
                            <img src={image} alt="Xem trước" className="w-full h-full object-contain rounded-lg" />
                        ) : (
                            <>
                                <UploadIcon className="w-8 h-8 mb-2"/>
                                <span>Tải lên hình ảnh</span>
                            </>
                        )}
                    </button>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên cây *</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border-2 border-gray-300 rounded-lg" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả ngắn</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-2 border-2 border-gray-300 rounded-lg" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phân loại *</label>
                        <select value={category} onChange={e => setCategory(e.target.value as PlantCategory)} className="w-full p-2 border-2 border-gray-300 rounded-lg bg-white">
                           {PLANT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <button onClick={handleSave} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition">Lưu cây</button>
                </div>
            </div>
        </div>
    );
};


type PlantDetailViewProps = {
  plant: MyPlant;
  onUpdatePlant: (updatedPlant: MyPlant) => void;
};

const PlantDetailView = ({ plant, onUpdatePlant }: PlantDetailViewProps) => {
    const [activeTab, setActiveTab] = useState('log');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLog, setEditingLog] = useState<CareLogEntry | null>(null);

    const [filterActivity, setFilterActivity] = useState<CareActivityType | 'all'>('all');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    const handleOpenModal = (log: CareLogEntry | null = null) => {
        setEditingLog(log);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingLog(null);
    };

    const handleSaveLog = (logData: Omit<CareLogEntry, 'id'> | CareLogEntry) => {
        let newLogs;
        const currentLogs = plant.careLog || [];
        if ('id' in logData) { // Editing
            newLogs = currentLogs.map(log => log.id === logData.id ? logData : log);
        } else { // Adding
            const newLog = { ...logData, id: Date.now() };
            newLogs = [newLog, ...currentLogs];
        }
        onUpdatePlant({ ...plant, careLog: newLogs });
        handleCloseModal();
    };

    const handleDeleteLog = (logId: number) => {
        if(window.confirm("Bạn có chắc chắn muốn xóa mục này?")) {
            const newLogs = (plant.careLog || []).filter(log => log.id !== logId);
            onUpdatePlant({ ...plant, careLog: newLogs });
        }
    };

    const filteredLogs = useMemo(() => {
        return (plant.careLog || [])
            .filter(log => filterActivity === 'all' || log.activity === filterActivity)
            .filter(log => !filterStartDate || new Date(log.date) >= new Date(filterStartDate))
            .filter(log => !filterEndDate || new Date(log.date) <= new Date(filterEndDate))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [plant.careLog, filterActivity, filterStartDate, filterEndDate]);

    return (
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {isModalOpen && (
          <CareLogModal
            onClose={handleCloseModal}
            onSave={handleSaveLog}
            initialData={editingLog}
          />
        )}
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 flex flex-col md:flex-row gap-6">
          <div className="md:w-1/3">
              <img src={plant.image} alt={plant.name} className="rounded-lg w-full h-auto object-cover aspect-square" />
          </div>
          <div className="md:w-2/3">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800">{plant.name}</h2>
              <p className="text-md md:text-lg text-gray-500 mb-4">{plant.category}</p>
              <p className="text-gray-600">{plant.description}</p>
          </div>
        </div>

        <div className="sticky top-[72px] bg-green-50 py-2 z-10">
            <div className="flex justify-center bg-green-100 rounded-full p-1 max-w-sm mx-auto shadow">
                <button onClick={() => setActiveTab('log')} className={`px-4 py-2 rounded-full font-semibold transition w-1/2 ${activeTab === 'log' ? 'bg-green-600 text-white' : 'text-green-700'}`}>Nhật ký chăm sóc</button>
                <button onClick={() => setActiveTab('info')} className={`px-4 py-2 rounded-full font-semibold transition w-1/2 ${activeTab === 'info' ? 'bg-green-600 text-white' : 'text-green-700'}`}>Thông tin</button>
            </div>
        </div>

        {activeTab === 'info' && (
            <div className="bg-white rounded-lg shadow p-4 animate-fade-in">
                <h3 className="text-lg font-semibold text-green-800 mb-2">Thông tin chi tiết</h3>
                <p><strong>Tên cây:</strong> {plant.name}</p>
                <p><strong>Phân loại:</strong> {plant.category}</p>
                <p><strong>Mô tả:</strong> {plant.description || "Không có mô tả."}</p>
            </div>
        )}

        {activeTab === 'log' && (
            <div className="bg-white rounded-lg shadow p-4 animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-green-800 flex items-center"><JournalIcon className="mr-2"/> Nhật ký chăm sóc</h3>
                  <button onClick={() => handleOpenModal()} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition flex items-center"><PlusIcon className="w-4 h-4 mr-1"/>Thêm hoạt động</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 p-3 bg-gray-50 rounded-md">
                    <select value={filterActivity} onChange={e => setFilterActivity(e.target.value as any)} className="w-full p-2 border-2 border-gray-300 rounded-lg bg-white">
                        <option value="all">Tất cả hoạt động</option>
                        {CARE_ACTIVITIES.map(act => <option key={act} value={act}>{act}</option>)}
                    </select>
                    <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full p-2 border-2 border-gray-300 rounded-lg" title="Ngày bắt đầu"/>
                    <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-full p-2 border-2 border-gray-300 rounded-lg" title="Ngày kết thúc"/>
                </div>

                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                    {filteredLogs.length > 0 ? filteredLogs.map(log => (
                        <div key={log.id} className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50">
                            <div className="flex items-start">
                                <div className="text-green-600 mr-3 text-2xl w-8 text-center">{getCareActivityIcon(log.activity)}</div>
                                <div>
                                    <p className="font-semibold">{log.activity}</p>
                                    <p className="text-sm text-gray-500">{new Date(log.date).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                    {log.notes && <p className="text-sm text-gray-600 mt-1">{log.notes}</p>}
                                </div>
                            </div>
                            <div className="flex space-x-2">
                                <button onClick={() => handleOpenModal(log)} className="text-blue-500 hover:text-blue-700"><EditIcon/></button>
                                <button onClick={() => handleDeleteLog(log.id)} className="text-red-500 hover:text-red-700"><TrashIcon/></button>
                            </div>
                        </div>
                    )) : (
                        <p className="text-center text-gray-500 py-8">Chưa có hoạt động nào được ghi lại.</p>
                    )}
                </div>
            </div>
        )}
      </div>
    );
};

const getCareActivityIcon = (activity: CareActivityType) => {
    switch (activity) {
        case 'Tưới nước': return <WaterDropIcon />;
        case 'Bón phân': return <FertilizerIcon />;
        case 'Diệt sâu bệnh': return <BugIcon />;
        case 'Cắt tỉa': return <PruningIcon />;
        default: return <NoteIcon />;
    }
};

type CareLogModalProps = {
    onClose: () => void;
    onSave: (logData: Omit<CareLogEntry, 'id'> | CareLogEntry) => void;
    initialData?: CareLogEntry | null;
}

const CareLogModal = ({ onClose, onSave, initialData }: CareLogModalProps) => {
    const [activity, setActivity] = useState<CareActivityType>(initialData?.activity || 'Tưới nước');
    const [date, setDate] = useState(initialData?.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState(initialData?.notes || '');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const logData = { activity, date, notes };
        if (initialData) {
            onSave({ ...logData, id: initialData.id });
        } else {
            onSave(logData);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-800 mb-4">{initialData ? 'Chỉnh sửa hoạt động' : 'Thêm hoạt động mới'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hoạt động</label>
                        <select value={activity} onChange={e => setActivity(e.target.value as CareActivityType)} className="w-full p-2 border-2 border-gray-300 rounded-lg bg-white">
                            {CARE_ACTIVITIES.map(act => <option key={act} value={act}>{act}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ngày</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border-2 border-gray-300 rounded-lg"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú (tùy chọn)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full p-2 border-2 border-gray-300 rounded-lg"/>
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Hủy</button>
                        <button type="submit" className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700">Lưu</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Reminder Components ---

type ReminderFormModalProps = {
    onClose: () => void;
    onSave: (reminder: Omit<Reminder, 'id'> | Reminder) => void;
    initialData?: Reminder | null;
    myPlants: MyPlant[];
};

const ReminderFormModal = ({ onClose, onSave, initialData, myPlants }: ReminderFormModalProps) => {
    const [title, setTitle] = useState(initialData?.title || '');
    const [plantId, setPlantId] = useState<number | 'all'>(initialData?.plantId || 'all');
    const [activity, setActivity] = useState<CareActivityType>(initialData?.activity || 'Tưới nước');
    const [frequency, setFrequency] = useState<'once' | 'daily' | 'weekly' | 'monthly'>(initialData?.frequency || 'weekly');
    const [daysOfWeek, setDaysOfWeek] = useState<number[]>(initialData?.daysOfWeek || []);
    const [dayOfMonth, setDayOfMonth] = useState<number>(initialData?.dayOfMonth || 1);
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState(initialData?.time || '08:00');

    const handleDayOfWeekChange = (dayValue: number) => {
        setDaysOfWeek(prev => prev.includes(dayValue) ? prev.filter(d => d !== dayValue) : [...prev, dayValue]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const reminderData: Omit<Reminder, 'id'> = {
            title, plantId, activity, frequency, time, isEnabled: initialData?.isEnabled ?? true,
            ...(frequency === 'weekly' && { daysOfWeek }),
            ...(frequency === 'monthly' && { dayOfMonth }),
            ...(frequency === 'once' && { date }),
        };
        if (initialData) {
            onSave({ ...reminderData, id: initialData.id });
        } else {
            onSave(reminderData);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-800 mb-4">{initialData ? 'Chỉnh sửa nhắc nhở' : 'Thêm nhắc nhở mới'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề nhắc nhở</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="VD: Tưới cây lan" className="w-full p-2 border-2 border-gray-300 rounded-lg" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Áp dụng cho</label>
                            <select value={plantId} onChange={e => setPlantId(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="w-full p-2 border-2 border-gray-300 rounded-lg bg-white">
                                <option value="all">Tất cả cây</option>
                                {myPlants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hoạt động</label>
                            <select value={activity} onChange={e => setActivity(e.target.value as CareActivityType)} className="w-full p-2 border-2 border-gray-300 rounded-lg bg-white">
                                {CARE_ACTIVITIES.map(act => <option key={act} value={act}>{act}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tần suất</label>
                        <select value={frequency} onChange={e => setFrequency(e.target.value as any)} className="w-full p-2 border-2 border-gray-300 rounded-lg bg-white">
                            <option value="once">Một lần</option>
                            <option value="daily">Hàng ngày</option>
                            <option value="weekly">Hàng tuần</option>
                            <option value="monthly">Hàng tháng</option>
                        </select>
                    </div>
                    {frequency === 'once' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Chọn ngày</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border-2 border-gray-300 rounded-lg" />
                        </div>
                    )}
                    {frequency === 'weekly' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Chọn ngày trong tuần</label>
                            <div className="flex justify-between items-center gap-1">
                                {DAYS_OF_WEEK.map(day => (
                                    <button type="button" key={day.value} onClick={() => handleDayOfWeekChange(day.value)}
                                        className={`w-10 h-10 rounded-full font-semibold transition ${daysOfWeek.includes(day.value) ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                        {day.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {frequency === 'monthly' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Chọn ngày trong tháng</label>
                            <input type="number" min="1" max="31" value={dayOfMonth} onChange={e => setDayOfMonth(Number(e.target.value))} className="w-full p-2 border-2 border-gray-300 rounded-lg" />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian</label>
                        <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full p-2 border-2 border-gray-300 rounded-lg" required />
                    </div>
                    <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Hủy</button>
                        <button type="submit" className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700">Lưu</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

type RemindersViewProps = {
    reminders: Reminder[];
    myPlants: MyPlant[];
    onSave: (reminder: Omit<Reminder, 'id'> | Reminder) => void;
    onUpdate: (reminder: Reminder) => void;
    onDelete: (id: number) => void;
};

const RemindersView = ({ reminders, myPlants, onSave, onUpdate, onDelete }: RemindersViewProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

    const handleOpenModal = (reminder: Reminder | null = null) => {
        setEditingReminder(reminder);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingReminder(null);
    };

    const handleSaveAndClose = (reminder: Omit<Reminder, 'id'> | Reminder) => {
        onSave(reminder);
        handleCloseModal();
    };

    const getPlantName = (plantId: number | 'all') => {
        if (plantId === 'all') return "Tất cả cây";
        return myPlants.find(p => p.id === plantId)?.name || "Cây không xác định";
    };
    
    const getScheduleText = (r: Reminder) => {
        switch(r.frequency) {
            case 'once': return `Một lần vào ${new Date(r.date + 'T00:00:00').toLocaleDateString('vi-VN')} lúc ${r.time}`;
            case 'daily': return `Hàng ngày lúc ${r.time}`;
            case 'monthly': return `Ngày ${r.dayOfMonth} hàng tháng lúc ${r.time}`;
            case 'weekly':
                const days = r.daysOfWeek?.sort().map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label).join(', ') || 'Không có ngày nào';
                return `Mỗi ${days} lúc ${r.time}`;
            default: return "Không có lịch";
        }
    };
    
    return (
        <div className="p-4 md:p-6">
            {isModalOpen && <ReminderFormModal onClose={handleCloseModal} onSave={handleSaveAndClose} initialData={editingReminder} myPlants={myPlants} />}
            <div className="mb-6 bg-white p-4 rounded-lg shadow">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-700">Quản lý nhắc nhở</h2>
                    <button onClick={() => handleOpenModal()} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition flex items-center">
                        <PlusIcon className="w-4 h-4 mr-1"/> Thêm
                    </button>
                </div>
                <p className="text-gray-500 text-sm mt-2">Nhắc nhở sẽ hiển thị dưới dạng cửa sổ bật lên khi bạn đang sử dụng ứng dụng.</p>
            </div>

            <div className="space-y-4">
                {reminders.length > 0 ? reminders.map(r => (
                    <div key={r.id} className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
                        <div className="flex items-center">
                            <label className="relative inline-flex items-center cursor-pointer mr-4">
                              <input type="checkbox" checked={r.isEnabled} onChange={() => onUpdate({ ...r, isEnabled: !r.isEnabled })} className="sr-only peer" />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                            </label>
                            <div className={r.isEnabled ? '' : 'opacity-50'}>
                                <h3 className="font-bold text-gray-800">{r.title} ({r.activity})</h3>
                                <p className="text-sm text-gray-600">{getPlantName(r.plantId)}</p>
                                <p className="text-sm text-gray-500">{getScheduleText(r)}</p>
                            </div>
                        </div>
                        <div className="flex space-x-2">
                             <button onClick={() => handleOpenModal(r)} className="text-blue-500 hover:text-blue-700"><EditIcon/></button>
                             <button onClick={() => onDelete(r.id)} className="text-red-500 hover:text-red-700"><TrashIcon/></button>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-16">
                      <p className="text-gray-500 mb-4">Bạn chưa có nhắc nhở nào.</p>
                      <button onClick={() => handleOpenModal()} className="bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition">
                        Tạo nhắc nhở đầu tiên
                      </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Game Components ---

const GameMenuView = ({ onSelectGame }: { onSelectGame: (game: View) => void }) => {
    // FIX: Explicitly type the `games` array to ensure `game.view` is inferred as type `View`.
    const games: { view: View; title: string; description: string; icon: React.ReactNode }[] = [
        { view: 'game_sequencing', title: "Vòng đời của cây", description: "Sắp xếp các giai đoạn phát triển.", icon: <DotIcon /> },
        { view: 'game_quiz', title: "Đố vui kiến thức", description: "Trả lời câu hỏi trắc nghiệm.", icon: <QuestionIcon /> },
        { view: 'game_matching', title: "Ghép đôi diệu kỳ", description: "Ghép bộ phận với chức năng.", icon: <PuzzlePieceIcon /> },
        { view: 'game_true_false', title: "Sự thật hay Thử thách?", description: "Kiểm tra kiến thức đúng/sai.", icon: <ThumbsUpIcon /> },
    ];

    return (
        <div className="p-4 md:p-6 text-center">
            <h2 className="text-3xl font-bold text-gray-700 mb-2">Trung tâm trò chơi khoa học</h2>
            <p className="text-gray-500 mb-8 max-w-lg mx-auto">Chọn một trò chơi để tìm hiểu thêm về thế giới thực vật!</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-2xl mx-auto">
                {games.map(game => (
                    <button key={game.view} onClick={() => onSelectGame(game.view)} className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-transform transform text-center group">
                        <div className="text-4xl text-green-500 mb-3 group-hover:scale-110 transition-transform">{game.icon}</div>
                        <h3 className="text-xl font-bold text-gray-800">{game.title}</h3>
                        <p className="text-gray-500">{game.description}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};


type PlantStage = {
    id: number;
    name: string;
    icon: React.ReactNode;
};

const PLANT_LIFE_CYCLE_STAGES: PlantStage[] = [
    { id: 1, name: "Hạt giống", icon: <DotIcon className="text-amber-800" /> },
    { id: 2, name: "Nảy mầm", icon: <LeafIcon className="text-lime-500" /> },
    { id: 3, name: "Cây non", icon: <FertilizerIcon className="text-green-500" /> },
    { id: 4, name: "Cây trưởng thành", icon: <GardenIcon className="text-green-700" /> },
    { id: 5, name: "Ra hoa & Tạo quả", icon: <AppleIcon className="text-red-500" /> },
];

const SequencingGameView = () => {
    const [slots, setSlots] = useState<(PlantStage | null)[]>(Array(PLANT_LIFE_CYCLE_STAGES.length).fill(null));
    const [options, setOptions] = useState<PlantStage[]>(() => shuffleArray(PLANT_LIFE_CYCLE_STAGES));
    const [selectedOption, setSelectedOption] = useState<PlantStage | null>(null);
    const [gameState, setGameState] = useState<'playing' | 'correct' | 'incorrect'>('playing');

    const handleOptionClick = (stage: PlantStage) => {
        if (gameState !== 'playing') return;
        setSelectedOption(stage);
    };

    const handleSlotClick = (index: number) => {
        if (gameState !== 'playing') return;
        
        if (selectedOption && !slots[index]) {
            const newSlots = [...slots];
            newSlots[index] = selectedOption;
            setSlots(newSlots);
            setOptions(options.filter(opt => opt.id !== selectedOption.id));
            setSelectedOption(null);
        } else if (slots[index]) {
            const stageToReturn = slots[index]!;
            const newSlots = [...slots];
            newSlots[index] = null;
            setSlots(newSlots);
            setOptions(shuffleArray([...options, stageToReturn]));
        }
    };

    const handleCheckAnswer = () => {
        const isCorrect = slots.every((stage, index) => stage && stage.id === index + 1);
        if (isCorrect) {
            setGameState('correct');
        } else {
            setGameState('incorrect');
            setTimeout(() => setGameState('playing'), 2000);
        }
    };

    const handlePlayAgain = () => {
        setSlots(Array(PLANT_LIFE_CYCLE_STAGES.length).fill(null));
        setOptions(shuffleArray(PLANT_LIFE_CYCLE_STAGES));
        setSelectedOption(null);
        setGameState('playing');
    };
    
    return (
        <div className="p-4 md:p-6 text-center">
            <h2 className="text-3xl font-bold text-gray-700 mb-2">Vòng đời của cây</h2>
            <p className="text-gray-500 mb-6 max-w-lg mx-auto">Sắp xếp các giai đoạn sau theo đúng thứ tự phát triển của một cái cây.</p>
            
            <div className="flex justify-center items-center flex-wrap gap-2 md:gap-4 mb-8 p-4 bg-green-100 rounded-lg shadow-inner">
                {slots.map((stage, index) => (
                    <div key={index} onClick={() => handleSlotClick(index)} className={`w-24 h-32 md:w-28 md:h-36 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all ${slots[index] ? 'border-green-500 bg-white' : 'border-gray-400 hover:bg-green-50'}`}>
                       <span className="text-2xl font-bold text-gray-400">{index + 1}</span>
                       {stage && (
                           <div className="text-center animate-fade-in">
                               <span className="text-4xl">{stage.icon}</span>
                               <p className="font-semibold text-sm mt-2">{stage.name}</p>
                           </div>
                       )}
                    </div>
                ))}
            </div>

            <div className="mb-8">
                <h3 className="font-semibold text-gray-600 mb-4">Chọn một giai đoạn để sắp xếp:</h3>
                <div className="flex justify-center flex-wrap gap-3">
                    {options.map(stage => (
                       <div key={stage.id} onClick={() => handleOptionClick(stage)} className={`w-24 h-28 p-2 border-2 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all transform hover:scale-105 ${selectedOption?.id === stage.id ? 'border-green-600 bg-green-100 ring-2 ring-green-500' : 'border-gray-300 bg-white'}`}>
                           <span className="text-4xl">{stage.icon}</span>
                           <p className="font-semibold text-sm mt-2 text-center">{stage.name}</p>
                       </div>
                    ))}
                </div>
            </div>

            <div className="h-20">
               {gameState === 'playing' && options.length === 0 && (
                    <button onClick={handleCheckAnswer} className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 transition animate-pulse">Kiểm tra kết quả</button>
               )}
               {gameState === 'correct' && (
                   <div className="text-center text-green-600 animate-fade-in">
                       <p className="text-2xl font-bold mb-2">🎉 Chính xác! Bạn giỏi quá! 🎉</p>
                       <button onClick={handlePlayAgain} className="bg-blue-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-600 transition">Chơi lại</button>
                   </div>
               )}
               {gameState === 'incorrect' && (
                   <div className="text-center text-red-500 animate-shake">
                       <p className="text-xl font-bold">Chưa đúng lắm, hãy thử lại nhé!</p>
                   </div>
               )}
            </div>
        </div>
    )
};


const ALL_QUIZ_QUESTIONS = [
    { question: "Cây cần những gì để quang hợp?", options: ["Ánh sáng mặt trời", "Nước & Khí Carbonic", "Chất diệp lục", "Tất cả đều đúng"], answer: "Tất cả đều đúng" },
    { question: "Bộ phận nào của cây có chức năng hút nước và chất dinh dưỡng từ đất?", options: ["Lá", "Rễ", "Thân", "Hoa"], answer: "Rễ" },
    { question: "Chất diệp lục làm cho lá cây có màu gì?", options: ["Đỏ", "Vàng", "Xanh lá", "Tím"], answer: "Xanh lá" },
    { question: "Quá trình cây tạo ra thức ăn được gọi là gì?", options: ["Hô hấp", "Quang hợp", "Thoát hơi nước", "Nảy mầm"], answer: "Quang hợp" },
    { question: "Hoa có chức năng chính là gì?", options: ["Hút nước", "Sinh sản", "Vận chuyển chất", "Quang hợp"], answer: "Sinh sản" },
    { question: "Quả của cây được phát triển từ bộ phận nào?", options: ["Rễ", "Lá", "Thân", "Hoa"], answer: "Hoa" },
    { question: "Phấn hoa được chuyển từ hoa này sang hoa khác gọi là gì?", options: ["Quang hợp", "Thụ phấn", "Nảy mầm", "Hô hấp"], answer: "Thụ phấn" },
    { question: "Lá cây có các lỗ nhỏ li ti để trao đổi khí gọi là gì?", options: ["Mạch gỗ", "Lông hút", "Khí khổng", "Vỏ cây"], answer: "Khí khổng" },
    { question: "Một số cây rụng lá vào mùa đông để làm gì?", options: ["Để trông đẹp hơn", "Tiết kiệm năng lượng và nước", "Chuẩn bị ra hoa", "Để tránh sâu bệnh"], answer: "Tiết kiệm năng lượng và nước" },
    { question: "Cây tre thuộc họ thực vật nào?", options: ["Họ Cúc", "Họ Lan", "Họ Đậu", "Họ Cỏ"], answer: "Họ Cỏ" },
];
const QUESTIONS_PER_QUIZ = 5;

const QuizGameView = () => {
    const [questions, setQuestions] = useState(() => shuffleArray(ALL_QUIZ_QUESTIONS).slice(0, QUESTIONS_PER_QUIZ));
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);

    const handleAnswer = (option: string) => {
        if (isAnswered) return;
        setSelectedAnswer(option);
        setIsAnswered(true);
        if (option === questions[currentIndex].answer) {
            setScore(score + 1);
        }
    };

    const handleNext = () => {
        setIsAnswered(false);
        setSelectedAnswer(null);
        setCurrentIndex(currentIndex + 1);
    };
    
    const handlePlayAgain = () => {
        setQuestions(shuffleArray(ALL_QUIZ_QUESTIONS).slice(0, QUESTIONS_PER_QUIZ));
        setCurrentIndex(0);
        setScore(0);
        setSelectedAnswer(null);
        setIsAnswered(false);
    };

    if (currentIndex >= questions.length) {
        return (
            <div className="p-4 md:p-6 text-center animate-fade-in">
                <h2 className="text-3xl font-bold text-gray-700 mb-4">Hoàn thành!</h2>
                <p className="text-xl text-gray-600 mb-6">Bạn đã trả lời đúng {score} / {questions.length} câu hỏi.</p>
                <button onClick={handlePlayAgain} className="bg-blue-500 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-600 transition">Chơi lại</button>
            </div>
        );
    }

    const { question, options, answer } = questions[currentIndex];
    return (
        <div className="p-4 md:p-6 text-center">
            <p className="text-gray-500 mb-2">Câu hỏi {currentIndex + 1} / {questions.length} | Điểm: {score}</p>
            <div className="bg-white p-6 rounded-lg shadow-md min-h-[200px] flex items-center justify-center mb-6">
                <h2 className="text-2xl font-bold text-gray-700">{question}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {options.map((option, i) => {
                    let buttonClass = "w-full text-lg font-semibold py-4 px-4 rounded-lg transition-transform transform hover:scale-105 ";
                    if (isAnswered) {
                        if (option === answer) {
                            buttonClass += "bg-green-500 text-white";
                        } else if (option === selectedAnswer) {
                            buttonClass += "bg-red-500 text-white";
                        } else {
                            buttonClass += "bg-gray-200 text-gray-700 opacity-60";
                        }
                    } else {
                         buttonClass += "bg-white text-green-700 border-2 border-green-600 hover:bg-green-50";
                    }
                    return <button key={i} onClick={() => handleAnswer(option)} disabled={isAnswered} className={buttonClass}>{option}</button>;
                })}
            </div>
             {isAnswered && (
                <button onClick={handleNext} className="mt-8 bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 transition animate-fade-in">Câu tiếp theo</button>
            )}
        </div>
    );
};

const ALL_MATCHING_PAIRS = [
  { id: 1, type: 'part', text: 'Rễ', matchId: 101 },
  { id: 101, type: 'function', text: 'Hút nước và chất dinh dưỡng, giữ cây đứng vững.', matchId: 1 },
  { id: 2, type: 'part', text: 'Thân', matchId: 102 },
  { id: 102, type: 'function', text: 'Vận chuyển nước và thức ăn, nâng đỡ lá và hoa.', matchId: 2 },
  { id: 3, type: 'part', text: 'Lá', matchId: 103 },
  { id: 103, type: 'function', text: 'Thực hiện quang hợp để tạo ra thức ăn cho cây.', matchId: 3 },
  { id: 4, type: 'part', text: 'Hoa', matchId: 104 },
  { id: 104, type: 'function', text: 'Giúp cây sinh sản, tạo ra quả và hạt.', matchId: 4 },
  { id: 5, type: 'part', text: 'Quả', matchId: 105 },
  { id: 105, type: 'function', text: 'Bảo vệ hạt và giúp phát tán hạt giống.', matchId: 5 },
  { id: 6, type: 'part', text: 'Hạt phấn', matchId: 106 },
  { id: 106, type: 'function', text: 'Tế bào sinh sản đực, cần thiết cho sự thụ tinh.', matchId: 6 },
  { id: 7, type: 'part', text: 'Khí khổng', matchId: 107 },
  { id: 107, type: 'function', text: 'Những lỗ nhỏ trên lá giúp cây "thở" và thoát hơi nước.', matchId: 7 },
  { id: 8, type: 'part', text: 'Chất diệp lục', matchId: 108 },
  { id: 108, type: 'function', text: 'Sắc tố màu xanh giúp hấp thụ năng lượng mặt trời.', matchId: 8 },
];
const PAIRS_PER_MATCHING_GAME = 5;

const MatchingGameView = () => {
    const [currentPairs, setCurrentPairs] = useState(() => shuffleArray(ALL_MATCHING_PAIRS).slice(0, PAIRS_PER_MATCHING_GAME));
    const [parts, setParts] = useState(currentPairs.map(p => ({id: p.id, type: 'part', text: p.text, matchId: p.matchId})));
    const [functions, setFunctions] = useState(() => shuffleArray(currentPairs.map(p => ({id: p.matchId, type: 'function', text: ALL_MATCHING_PAIRS.find(item => item.id === p.id)!.type === 'function' ? ALL_MATCHING_PAIRS.find(item => item.id === p.id)!.text : ALL_MATCHING_PAIRS.find(item => item.matchId === p.id)!.text, matchId: p.id }))));
    const [selectedPart, setSelectedPart] = useState<any | null>(null);
    const [matchedIds, setMatchedIds] = useState<number[]>([]);
    const [isWrong, setIsWrong] = useState(false);

    const startNewGame = () => {
        const newPairs = shuffleArray(ALL_MATCHING_PAIRS).slice(0, PAIRS_PER_MATCHING_GAME);
        const newParts = newPairs.map(p => ({id: p.id, type: 'part', text: p.text, matchId: p.matchId}));
        const newFunctions = newPairs.map(p => ({id: p.matchId, type: 'function', text: ALL_MATCHING_PAIRS.find(item => item.id === p.id)!.type === 'function' ? ALL_MATCHING_PAIRS.find(item => item.id === p.id)!.text : ALL_MATCHING_PAIRS.find(item => item.matchId === p.id)!.text, matchId: p.id }));

        setCurrentPairs(newPairs);
        setParts(newParts);
        setFunctions(shuffleArray(newFunctions));
        setSelectedPart(null);
        setMatchedIds([]);
        setIsWrong(false);
    };

    const handlePartClick = (part: any) => {
        if (matchedIds.includes(part.id) || isWrong) return;
        setSelectedPart(part);
    };

    const handleFunctionClick = (func: any) => {
        if (!selectedPart || matchedIds.includes(func.id) || isWrong) return;
        if (selectedPart.matchId === func.id) {
            setMatchedIds(prev => [...prev, selectedPart.id, func.id]);
            setSelectedPart(null);
        } else {
            setIsWrong(true);
            setTimeout(() => {
                setIsWrong(false);
                setSelectedPart(null);
            }, 800);
        }
    };
    
    const allMatched = matchedIds.length === currentPairs.length * 2;

    return (
        <div className="p-4 md:p-6 text-center">
            <h2 className="text-3xl font-bold text-gray-700 mb-2">Ghép đôi diệu kỳ</h2>
            <p className="text-gray-500 mb-6 max-w-lg mx-auto">Ghép mỗi bộ phận của cây với chức năng tương ứng của nó.</p>
            
            <div className="grid grid-cols-2 gap-4 md:gap-8 max-w-3xl mx-auto">
                <div className="space-y-3">
                    <h3 className="font-bold text-xl text-gray-700">Bộ phận / Khái niệm</h3>
                    {parts.map(part => (
                        <button key={part.id} onClick={() => handlePartClick(part)}
                            disabled={matchedIds.includes(part.id)}
                            className={`w-full p-4 rounded-lg text-lg font-semibold transition ${
                                matchedIds.includes(part.id) ? 'bg-green-200 text-green-800 cursor-not-allowed' : 
                                selectedPart?.id === part.id ? 'bg-blue-500 text-white ring-2 ring-blue-600' :
                                'bg-white shadow hover:bg-blue-50'
                            }`}>
                            {part.text}
                        </button>
                    ))}
                </div>
                <div className="space-y-3">
                    <h3 className="font-bold text-xl text-gray-700">Chức năng / Mô tả</h3>
                    {functions.map(func => (
                        <button key={func.id} onClick={() => handleFunctionClick(func)}
                            disabled={matchedIds.includes(func.id)}
                            className={`w-full p-4 rounded-lg text-left text-sm font-semibold transition ${
                                matchedIds.includes(func.id) ? 'bg-green-200 text-green-800 cursor-not-allowed' :
                                isWrong && selectedPart?.matchId !== func.id ? 'bg-red-200 animate-shake' : 
                                'bg-white shadow hover:bg-blue-50'
                            }`}>
                            {func.text}
                        </button>
                    ))}
                </div>
            </div>
            {allMatched && (
                 <div className="mt-8 text-center text-green-600 animate-fade-in">
                     <p className="text-2xl font-bold mb-2">🎉 Tuyệt vời! Bạn đã ghép đúng tất cả! 🎉</p>
                     <button onClick={startNewGame} className="bg-blue-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-600 transition">Chơi lại</button>
                 </div>
            )}
        </div>
    );
};

const ALL_TRUE_FALSE_STATEMENTS = [
    { statement: "Tất cả các loài cây đều có hoa.", isTrue: false, explanation: "Không đúng! Các loài cây như rêu và dương xỉ không có hoa." },
    { statement: "Cây xương rồng dự trữ nước trong thân của nó.", isTrue: true, explanation: "Chính xác! Thân mọng nước của xương rồng giúp nó sống sót ở sa mạc khô cằn." },
    { statement: "Cây cũng 'thở' vào ban đêm, quá trình này gọi là hô hấp.", isTrue: true, explanation: "Đúng vậy! Cây lấy oxy và thải ra khí carbonic vào ban đêm, ngược lại với quang hợp." },
    { statement: "Cây hướng dương trưởng thành luôn quay theo hướng mặt trời.", isTrue: false, explanation: "Không hẳn! Chỉ những cây hướng dương non mới có hành vi này. Cây trưởng thành thường chỉ hướng về phía đông." },
    { statement: "Cây bắt ruồi Venus là một loài thực vật ăn thịt.", isTrue: true, explanation: "Chính xác! Nó bẫy và tiêu hóa côn trùng để lấy thêm chất dinh dưỡng." },
    { statement: "Nấm là một loại thực vật.", isTrue: false, explanation: "Sai! Nấm thuộc một giới sinh vật riêng, chúng không tự quang hợp được." },
    { statement: "Cây cối có thể giao tiếp với nhau qua rễ.", isTrue: true, explanation: "Đúng! Chúng có thể gửi tín hiệu hóa học qua mạng lưới nấm ở rễ để cảnh báo hoặc chia sẻ dinh dưỡng." },
    { statement: "Tất cả các loại quả mọng đều có màu đỏ.", isTrue: false, explanation: "Sai! Quả việt quất màu xanh, quả mâm xôi màu đen, và còn nhiều màu sắc khác." },
    { statement: "Cây tre nở hoa hàng năm.", isTrue: false, explanation: "Rất hiếm! Nhiều loài tre chỉ nở hoa một lần sau vài chục năm rồi chết đi." },
    { statement: "Một số loài cây có thể di chuyển lá của chúng.", isTrue: true, explanation: "Đúng vậy! Ví dụ như cây trinh nữ (cây xấu hổ) sẽ khép lá lại khi bị chạm vào." },
];
const STATEMENTS_PER_GAME = 5;

const TrueFalseGameView = () => {
    const [statements, setStatements] = useState(() => shuffleArray(ALL_TRUE_FALSE_STATEMENTS).slice(0, STATEMENTS_PER_GAME));
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [isAnswered, setIsAnswered] = useState(false);
    const [wasCorrect, setWasCorrect] = useState(false);

    const handleAnswer = (userAnswer: boolean) => {
        if (isAnswered) return;
        setIsAnswered(true);
        const correct = userAnswer === statements[currentIndex].isTrue;
        setWasCorrect(correct);
        if (correct) {
            setScore(score + 1);
        }
    };
    
    const handleNext = () => {
        setIsAnswered(false);
        setCurrentIndex(currentIndex + 1);
    };

    const handlePlayAgain = () => {
        setStatements(shuffleArray(ALL_TRUE_FALSE_STATEMENTS).slice(0, STATEMENTS_PER_GAME));
        setCurrentIndex(0);
        setScore(0);
        setIsAnswered(false);
    };

    if (currentIndex >= statements.length) {
        return (
            <div className="p-4 md:p-6 text-center animate-fade-in">
                <h2 className="text-3xl font-bold text-gray-700 mb-4">Hoàn thành!</h2>
                <p className="text-xl text-gray-600 mb-6">Bạn đã trả lời đúng {score} / {statements.length} câu.</p>
                <button onClick={handlePlayAgain} className="bg-blue-500 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-600 transition">Chơi lại</button>
            </div>
        );
    }
    
    const { statement, explanation } = statements[currentIndex];
    
    return (
        <div className="p-4 md:p-6 text-center">
             <p className="text-gray-500 mb-2">Câu hỏi {currentIndex + 1} / {statements.length} | Điểm: {score}</p>
             <div className="bg-white p-6 rounded-lg shadow-md min-h-[150px] flex items-center justify-center mb-6">
                <h2 className="text-2xl font-bold text-gray-700">{statement}</h2>
            </div>
            {!isAnswered ? (
                 <div className="flex justify-center items-center gap-4">
                    <button onClick={() => handleAnswer(true)} className="flex items-center justify-center gap-2 w-48 bg-green-500 text-white font-bold py-4 rounded-lg hover:bg-green-600 transition-transform transform hover:scale-105">
                        <ThumbsUpIcon/> Đúng
                    </button>
                     <button onClick={() => handleAnswer(false)} className="flex items-center justify-center gap-2 w-48 bg-red-500 text-white font-bold py-4 rounded-lg hover:bg-red-600 transition-transform transform hover:scale-105">
                        <ThumbsDownIcon/> Sai
                    </button>
                </div>
            ) : (
                <div className="animate-fade-in">
                    <div className={`p-4 rounded-lg mb-4 ${wasCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        <div className="flex items-center justify-center text-xl font-bold">
                           {wasCorrect ? <CheckCircleIcon className="mr-2"/> : <TimesCircleIcon className="mr-2"/>}
                           {wasCorrect ? "Chính xác!" : "Chưa đúng!"}
                        </div>
                        <p className="mt-2">{explanation}</p>
                    </div>
                    <button onClick={handleNext} className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 transition">Câu tiếp theo</button>
                </div>
            )}
        </div>
    );
};

const DELETION_REASONS = [
    'Cây đã chết',
    'Cây bị bệnh nặng không thể cứu chữa',
    'Không còn thời gian chăm sóc',
    'Thêm nhầm vào vườn'
];

type DeleteConfirmationModalProps = {
    plant: MyPlant;
    onClose: () => void;
    onConfirm: (plantId: number, reason: string) => void;
}

const DeleteConfirmationModal = ({ plant, onClose, onConfirm }: DeleteConfirmationModalProps) => {
    const [selectedReason, setSelectedReason] = useState('');
    const [otherReason, setOtherReason] = useState('');

    const handleConfirm = () => {
        const finalReason = selectedReason === 'Khác' ? otherReason : selectedReason;
        if (!finalReason.trim()) return;
        onConfirm(plant.id, finalReason);
    };

    const isConfirmDisabled = !selectedReason || (selectedReason === 'Khác' && !otherReason.trim());

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 transform transition-all" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Xác nhận xóa cây</h2>
                <p className="text-gray-600 mb-4">Bạn sắp xóa <span className="font-semibold">{plant.name}</span>. Hành động này không thể hoàn tác.</p>
                <div className="space-y-3">
                    <p className="font-semibold text-gray-700">Vui lòng cho biết lý do (để AI học hỏi):</p>
                    {DELETION_REASONS.map(reason => (
                        <label key={reason} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                            <input type="radio" name="delete_reason" value={reason} checked={selectedReason === reason} onChange={(e) => setSelectedReason(e.target.value)} className="form-radio h-4 w-4 text-green-600 focus:ring-green-500"/>
                            <span>{reason}</span>
                        </label>
                    ))}
                    <label className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                        <input type="radio" name="delete_reason" value="Khác" checked={selectedReason === 'Khác'} onChange={(e) => setSelectedReason(e.target.value)} className="form-radio h-4 w-4 text-green-600 focus:ring-green-500"/>
                        <span>Khác</span>
                    </label>
                    {selectedReason === 'Khác' && (
                        <textarea
                            value={otherReason}
                            onChange={e => setOtherReason(e.target.value)}
                            placeholder="Nhập lý do của bạn..."
                            className="w-full p-2 border-2 border-gray-300 rounded-lg mt-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            rows={2}
                        />
                    )}
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                    <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Hủy</button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isConfirmDisabled}
                        className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition"
                    >
                        Xóa cây
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Main App Component ---

const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [plantInfo, setPlantInfo] = useState<PlantInfo | null>(null);
  const [plantImage, setPlantImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [growthLog, setGrowthLog] = useState<GrowthLogEntry[]>([]);
  const [newLogNote, setNewLogNote] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // State for "My Garden"
  const [myPlants, setMyPlants] = useState<MyPlant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<PlantCategory | 'all'>('all');
  const [selectedPlant, setSelectedPlant] = useState<MyPlant | null>(null);
  const [addPlantInitialData, setAddPlantInitialData] = useState<{ name: string; description: string; image: string | null; } | null>(null);
  const [plantToDelete, setPlantToDelete] = useState<MyPlant | null>(null);

  // State for Reminders
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activeReminder, setActiveReminder] = useState<Reminder | null>(null);
  const lastTriggeredRef = useRef<string | null>(null);

  // State for Weather
  const [weatherInfo, setWeatherInfo] = useState<WeatherInfo | null>(null);
  const [weatherTip, setWeatherTip] = useState<string | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data from localStorage on initial render
  useEffect(() => {
    try {
      const savedPlants = localStorage.getItem('myPlants');
      if (savedPlants) setMyPlants(JSON.parse(savedPlants));
      const savedReminders = localStorage.getItem('myReminders');
      if (savedReminders) setReminders(JSON.parse(savedReminders));
    } catch (e) {
      console.error("Failed to load data from localStorage", e);
    }
  }, []);

  // Save data to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('myPlants', JSON.stringify(myPlants));
    } catch (e) { console.error("Failed to save plants to localStorage", e); }
  }, [myPlants]);

  useEffect(() => {
    try {
        localStorage.setItem('myReminders', JSON.stringify(reminders));
    } catch (e) { console.error("Failed to save reminders to localStorage", e); }
  }, [reminders]);

  // Effect to fetch weather ONCE on mount
  useEffect(() => {
    const fetchWeatherData = () => {
      if (!navigator.geolocation) {
        console.log("Geolocation is not supported.");
        setIsWeatherLoading(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const weatherData = await getWeatherInfo(latitude, longitude);
            setWeatherInfo(weatherData);
          } catch (e) {
            console.error("Failed to fetch weather data", e);
            setWeatherInfo(null);
          }
        },
        (error) => {
          console.error("Geolocation error:", error.message);
          setIsWeatherLoading(false);
        }
      );
    };
    fetchWeatherData();
  }, []);

  // Effect to generate tip when weather or plants change
  useEffect(() => {
    const generateTip = async () => {
      if (!weatherInfo) {
        if (!isWeatherLoading) setWeatherTip(null);
        return;
      }
      try {
        if (myPlants.length > 0) {
          const plantNames = myPlants.map((p) => p.name);
          const tip = await getWeatherBasedTip(weatherInfo, plantNames);
          setWeatherTip(tip);
        } else {
          setWeatherTip(
            "Thêm cây vào vườn để nhận mẹo chăm sóc theo thời tiết nhé!"
          );
        }
      } catch (e) {
        console.error("Failed to generate weather tip", e);
        setWeatherTip("Không thể tạo mẹo chăm sóc lúc này.");
      } finally {
        setIsWeatherLoading(false);
      }
    };
    generateTip();
  }, [weatherInfo, myPlants.length]);


  // Reminder checking interval - Using Popup instead of System Notification
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentTime = now.toTimeString().substring(0, 5); // HH:MM
      const currentDayOfWeek = now.getDay(); // 0 = Sunday
      const currentDayOfMonth = now.getDate();
      const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Prevent double firing in the same minute
      if (lastTriggeredRef.current === currentTime) return;

      const dueReminder = reminders.find(reminder => {
        if (!reminder.isEnabled || reminder.time !== currentTime) return false;
        
        switch(reminder.frequency) {
          case 'once':
            return reminder.date === currentDate;
          case 'daily':
            return true;
          case 'weekly':
            return reminder.daysOfWeek?.includes(currentDayOfWeek);
          case 'monthly':
            return reminder.dayOfMonth === currentDayOfMonth;
          default:
            return false;
        }
      });
  
      if (dueReminder) {
         setActiveReminder(dueReminder);
         lastTriggeredRef.current = currentTime;
      }
    };
    
    // Check more frequently (every 5s) to ensure we don't miss the minute, 
    // but use lastTriggeredRef to prevent spamming
    const intervalId = setInterval(checkReminders, 5000); 
    return () => clearInterval(intervalId);
  }, [reminders]);


  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fullBase64 = await fileToBase64(file);
      const base64String = fullBase64.split(',')[1];
      setPlantImage(fullBase64);
      processPlantIdentification(base64String);
    }
  };

  const processPlantIdentification = async (base64String: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await identifyPlant(base64String);
      setPlantInfo(result);
      setGrowthLog([]);
      setView('result');
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi không xác định.');
      setView('home');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchByName = async () => {
    if (!searchQuery.trim()) {
      setError('Vui lòng nhập tên cây.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await searchPlantByName(searchQuery);
      setPlantInfo(result);
      setPlantImage(null);
      setGrowthLog([]);
      setView('result');
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi không xác định.');
    } finally {
      setIsLoading(false);
      setSearchQuery('');
    }
  };

  const handleBackClick = () => {
    setError(null);
    if (view === 'add_plant' || view === 'plant_detail') {
      setView('my_garden');
      setSelectedPlant(null);
      setAddPlantInitialData(null);
    } else if (view.startsWith('game_') && view !== 'game_menu') {
        setView('game_menu');
    } else if (['result', 'search_by_name', 'my_garden', 'reminders', 'game_menu'].includes(view)) {
      setView('home');
    }
  };

  const handleAddLog = () => {
    if (plantImage && newLogNote) {
      const newEntry: GrowthLogEntry = {
        id: Date.now(),
        image: plantImage,
        note: newLogNote,
        date: new Date().toLocaleDateString('vi-VN'),
      };
      setGrowthLog(prev => [newEntry, ...prev]);
      setNewLogNote('');
    }
  };
  
  const handleInitiateAddToGarden = () => {
    if (!plantInfo) return;
    setAddPlantInitialData({
      name: plantInfo.tenThuongGoi,
      description: plantInfo.moTaNgan,
      image: plantImage,
    });
    setView('add_plant');
  };

  const handleSavePlant = (plantData: Omit<MyPlant, 'id'>) => {
    const newPlant: MyPlant = {
      id: Date.now(),
      careLog: [],
      ...plantData,
    };
    setMyPlants(prev => [newPlant, ...prev]);
    setView('my_garden');
    setAddPlantInitialData(null);
  };
  
  const handleOpenDeleteModal = (plant: MyPlant) => {
    setPlantToDelete(plant);
  };
  
  const handleConfirmDelete = (plantId: number, reason: string) => {
      console.log(`Đã xóa cây ID ${plantId} với lý do: "${reason}". Dữ liệu này có thể được dùng để cải thiện AI.`);
      setMyPlants(prev => prev.filter(p => p.id !== plantId));
      setPlantToDelete(null); // Close modal
  };
  
  const handleCloseDeleteModal = () => {
      setPlantToDelete(null);
  };

  const handleSelectPlant = (plant: MyPlant) => {
    setSelectedPlant(plant);
    setView('plant_detail');
  };
  
  const handleUpdatePlant = (updatedPlant: MyPlant) => {
      setMyPlants(prevPlants => prevPlants.map(p => p.id === updatedPlant.id ? updatedPlant : p));
      setSelectedPlant(updatedPlant);
  };

  const handleSaveReminder = (reminderData: Omit<Reminder, 'id'> | Reminder) => {
      if ('id' in reminderData) { // Editing
          setReminders(prev => prev.map(r => r.id === reminderData.id ? reminderData : r));
      } else { // Adding
          const newReminder = { ...reminderData, id: Date.now() };
          setReminders(prev => [newReminder, ...prev]);
      }
  };
  
  const handleUpdateReminder = (updatedReminder: Reminder) => {
      setReminders(prev => prev.map(r => r.id === updatedReminder.id ? updatedReminder : r));
  };
  
  const handleDeleteReminder = (id: number) => {
      if (window.confirm("Bạn có chắc chắn muốn xóa nhắc nhở này?")) {
          setReminders(prev => prev.filter(r => r.id !== id));
      }
  };

  const filteredPlants = useMemo(() => {
    return myPlants
      .filter(plant => filterCategory === 'all' || plant.category === filterCategory)
      .filter(plant => plant.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [myPlants, searchTerm, filterCategory]);
  
  const getActiveReminderPlantName = () => {
    if (!activeReminder) return '';
    if (activeReminder.plantId === 'all') return 'tất cả cây của bạn';
    return myPlants.find(p => p.id === activeReminder.plantId)?.name || 'cây không xác định';
  };

  const renderView = () => {
    switch(view) {
      case 'result':
        return plantInfo ? (
          <ResultView 
            plantInfo={plantInfo}
            plantImage={plantImage}
            growthLog={growthLog}
            newLogNote={newLogNote}
            onNewLogNoteChange={(e) => setNewLogNote(e.target.value)}
            onAddLog={handleAddLog}
            onAddToGarden={handleInitiateAddToGarden}
          />
        ) : null;
      case 'search_by_name':
        return (
          <SearchByNameView 
            error={error}
            searchQuery={searchQuery}
            onSearchQueryChange={(e) => setSearchQuery(e.target.value)}
            onSearch={handleSearchByName}
          />
        );
      case 'my_garden':
        return (
            <MyGardenView
                plants={filteredPlants}
                onAddPlant={() => setView('add_plant')}
                onSelectPlant={handleSelectPlant}
                onDeletePlant={handleOpenDeleteModal}
                searchTerm={searchTerm}
                onSearchTermChange={e => setSearchTerm(e.target.value)}
                filterCategory={filterCategory}
                onFilterCategoryChange={e => setFilterCategory(e.target.value as PlantCategory | 'all')}
            />
        );
      case 'add_plant':
        return <AddPlantView onSave={handleSavePlant} initialData={addPlantInitialData} />;
      case 'plant_detail':
        return selectedPlant ? <PlantDetailView plant={selectedPlant} onUpdatePlant={handleUpdatePlant} /> : null;
      case 'reminders':
        return <RemindersView reminders={reminders} myPlants={myPlants} onSave={handleSaveReminder} onUpdate={handleUpdateReminder} onDelete={handleDeleteReminder} />;
      case 'game_menu':
        return <GameMenuView onSelectGame={(gameView) => setView(gameView)} />;
      case 'game_sequencing':
        return <SequencingGameView />;
      case 'game_quiz':
          return <QuizGameView />;
      case 'game_matching':
          return <MatchingGameView />;
      case 'game_true_false':
          return <TrueFalseGameView />;
      case 'home':
      default:
        return (
          <HomeView 
            error={error}
            onUploadClick={() => fileInputRef.current?.click()}
            onSearchClick={() => setView('search_by_name')}
            onMyGardenClick={() => setView('my_garden')}
            onRemindersClick={() => setView('reminders')}
            onGameClick={() => setView('game_menu')}
            weatherInfo={weatherInfo}
            weatherTip={weatherTip}
            isWeatherLoading={isWeatherLoading}
            plantCount={myPlants.length}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {isLoading && <Loader />}
      {plantToDelete && (
        <DeleteConfirmationModal
            plant={plantToDelete}
            onClose={handleCloseDeleteModal}
            onConfirm={handleConfirmDelete}
        />
      )}
      {activeReminder && (
          <ReminderPopup 
              reminder={activeReminder} 
              plantName={getActiveReminderPlantName()} 
              onClose={() => setActiveReminder(null)} 
          />
      )}
      <Header view={view} onBackClick={handleBackClick} />
      <main className="flex-grow container mx-auto w-full max-w-5xl">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileInputRef}
          onChange={handleImageChange}
          className="hidden"
        />
        {renderView()}
      </main>
      <footer className="text-center text-sm text-gray-500 p-4">
        © {new Date().getFullYear()} GreenGarden. Cung cấp bởi Gemini AI.
      </footer>
    </div>
  );
};

export default App;
