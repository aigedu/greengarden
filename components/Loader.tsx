
import React from 'react';
import { LeafIcon } from './icons';

const messages = [
  "AI đang phân tích hình ảnh...",
  "Đang tìm hiểu về cây của bạn...",
  "Sắp xong rồi, chờ một chút nhé!",
  "Đang chuẩn bị hướng dẫn chăm sóc..."
];

const Loader = () => {
  const [message, setMessage] = React.useState(messages[0]);

  React.useEffect(() => {
    const intervalId = setInterval(() => {
      setMessage(prevMessage => {
        const currentIndex = messages.indexOf(prevMessage);
        const nextIndex = (currentIndex + 1) % messages.length;
        return messages[nextIndex];
      });
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-50">
      <div className="flex items-center justify-center">
        <LeafIcon className="w-16 h-16 text-green-400 animate-spin" />
      </div>
      <p className="text-white text-lg mt-4 font-semibold text-center px-4 transition-opacity duration-500">{message}</p>
    </div>
  );
};

export default Loader;
