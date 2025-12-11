import { Avatar, CircularProgress } from "@nextui-org/react";
import { useNavigate } from "react-router-dom";

export default function HeaderCard({ data }: { data: any }) {
  const navigate = useNavigate();
  
  const caloriesPercent = Math.min(Math.round((data.current.calories / data.goals.calories) * 100), 100);
  const remainingCalories = data.goals.calories - data.current.calories;
  const isOverLimit = remainingCalories < 0;

  return (
    <div className="bg-blue-600 p-6 rounded-b-[2.5rem] shadow-xl text-white">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
           <div onClick={() => navigate('/profile')} className="cursor-pointer border-2 border-white/40 rounded-full bg-white/10">
               <Avatar src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${data.user?.avatar_seed || 'bear'}`} className="w-12 h-12" />
           </div>
           <div>
              <p className="text-xs text-blue-200">Привет,</p>
              <h1 className="text-xl font-bold leading-tight">{data.user.first_name}</h1>
           </div>
        </div>
        <button onClick={() => navigate('/achievements')} className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-2xl backdrop-blur-md">
           <span className="text-xl">🏆</span><span className="font-bold text-sm">{data.streak} дн.</span>
        </button>
      </div>

      <div className="flex gap-8 items-center justify-center pb-2">
        <div className="relative flex flex-col items-center">
          <CircularProgress 
            classNames={{ svg: "w-36 h-36 drop-shadow-md", indicator: isOverLimit ? "stroke-red-400" : "stroke-white", track: "stroke-white/20", value: "text-3xl font-bold text-white" }}
            value={caloriesPercent} strokeWidth={4} showValueLabel={true} formatOptions={{ style: "percent" }} 
          />
          <span className="text-sm mt-1 font-medium text-blue-100">от нормы</span>
        </div>
        <div className="flex flex-col gap-1">
           <div className="text-left">
              <span className="text-xs opacity-80">Осталось ккал</span>
              <p className={`text-3xl font-bold ${isOverLimit ? "text-red-200" : "text-white"}`}>{Math.abs(remainingCalories)}</p>
              {isOverLimit && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">ПЕРЕБОР</span>}
           </div>
        </div>
      </div>
    </div>
  );
}