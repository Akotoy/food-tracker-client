import { Card, CardBody, Button, Progress } from "@nextui-org/react";

interface Props {
    title: string;
    value: number;
    unit: string;
    goal?: string;
    color: "primary" | "secondary" | "success" | "warning" | "danger"; 
    onAdd: () => void;
    onSubtract: () => void;
    stepLabel: string;
    max?: number;
    // НОВЫЙ ПРОП: Какая кнопка главная? 'add' (Плюс) или 'subtract' (Минус)
    primaryAction?: 'add' | 'subtract'; 
}

export default function TrackerWidget({ 
    title, value, unit, goal, color, onAdd, onSubtract, stepLabel, max, 
    primaryAction = 'add' // По умолчанию главная кнопка - Плюс (как у воды)
}: Props) {
    
    // Стили
    const bgColors = { primary: "bg-cyan-50 border-cyan-100", secondary: "bg-purple-50 border-purple-100" };
    const textColors = { primary: "text-cyan-900", secondary: "text-purple-900" };
    const btnColors = { primary: "bg-cyan-500 shadow-cyan-500/30", secondary: "bg-purple-500 shadow-purple-500/30" };

    const bgClass = color === 'primary' ? bgColors.primary : bgColors.secondary;
    const textClass = color === 'primary' ? textColors.primary : textColors.secondary;
    const themeBtnClass = color === 'primary' ? btnColors.primary : btnColors.secondary;

    // Определяем классы кнопок в зависимости от primaryAction
    const subtractBtnClass = primaryAction === 'subtract' 
        ? `flex-1 text-white font-bold shadow-lg ${themeBtnClass}` // Большая цветная
        : "bg-white border shadow-sm min-w-[40px]"; // Маленькая белая

    const addBtnClass = primaryAction === 'add'
        ? `flex-1 text-white font-bold shadow-lg ${themeBtnClass}` // Большая цветная
        : "bg-white border shadow-sm min-w-[40px]"; // Маленькая белая

    return (
        <div className="px-6 mt-6">
            <h3 className="font-bold text-gray-700 text-lg mb-2">{title}</h3>
            <Card className={`${bgClass} border shadow-none`}>
                <CardBody>
                    <div className="flex justify-between items-end mb-2">
                        <span className={`font-bold text-3xl ${textClass}`}>{value} <span className="text-sm font-normal">{unit}</span></span>
                        {goal && <span className="text-xs opacity-60 mb-1">{goal}</span>}
                    </div>
                    
                    {max && <Progress value={(value / max) * 100} color={color} className="h-3" />}
                    
                    <div className="flex gap-3 mt-4">
                        {/* КНОПКА МИНУС */}
                        <Button 
                            className={subtractBtnClass}
                            isIconOnly={primaryAction !== 'subtract'} // Если не главная, делаем квадратной
                            onPress={onSubtract}
                        >
                            {primaryAction === 'subtract' ? "Снизить вес (-100г)" : "➖"}
                        </Button>

                        {/* КНОПКА ПЛЮС */}
                        <Button 
                            className={addBtnClass}
                            isIconOnly={primaryAction !== 'add'}
                            onPress={onAdd}
                        >
                            {primaryAction === 'add' ? stepLabel : "➕"}
                        </Button>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}