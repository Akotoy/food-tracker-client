import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input } from "@nextui-org/react";
import { useState, useEffect, useMemo } from "react";
import api from "../../api";
import WebApp from '@twa-dev/sdk';

export default function EditFoodModal({ isOpen, onClose, item, onRefresh }: any) {
    const [name, setName] = useState("");
    const [weight, setWeight] = useState("100");
    
    // Храним базовые значения на 1 грамм (плотность)
    const [ratios, setRatios] = useState({ cal: 0, prot: 0, fat: 0, carb: 0 });

    useEffect(() => {
        if (item) { 
            setName(item.name); 
            const currentWeight = item.weight_g || 100; // Если веса нет в базе, считаем 100г
            setWeight(String(currentWeight));

            // Вычисляем коэффициенты на 1 грамм
            setRatios({
                cal: item.calories / currentWeight,
                prot: item.protein / currentWeight,
                fat: item.fats / currentWeight,
                carb: item.carbs / currentWeight
            });
        }
    }, [item]);

    // Динамический пересчет при вводе веса
    const calculated = useMemo(() => {
        const w = Number(weight) || 0;
        return {
            calories: Math.round(w * ratios.cal),
            protein: Math.round(w * ratios.prot),
            fats: Math.round(w * ratios.fat),
            carbs: Math.round(w * ratios.carb),
        };
    }, [weight, ratios]);

    const handleUpdate = async () => {
        try {
            await api.put(`/api/log-food/${item.id}`, { 
                name, 
                weight_g: Number(weight),
                ...calculated // Отправляем пересчитанные БЖУ
            });
            try { WebApp.HapticFeedback.notificationOccurred('success'); } catch(e) {}
            onRefresh(); onClose();
        } catch (e) { alert("Ошибка"); }
    };

    const handleDelete = async () => {
        if (!confirm("Удалить?")) return;
        try {
            await api.delete(`/api/log-food/${item.id}`);
            try { WebApp.HapticFeedback.notificationOccurred('success'); } catch(e) {}
            onRefresh(); onClose();
        } catch (e) { alert("Ошибка"); }
    };

    return (
        <Modal isOpen={isOpen} onOpenChange={onClose} placement="center" backdrop="blur">
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader>Редактировать блюдо</ModalHeader>
                        <ModalBody>
                            <Input label="Название" value={name} onValueChange={setName} variant="bordered" />
                            
                            <div className="flex gap-4 items-center">
                                <Input 
                                    label="Вес (граммы)" 
                                    type="number" 
                                    color="primary"
                                    value={weight} 
                                    onValueChange={setWeight} 
                                    variant="bordered" 
                                />
                                <div className="text-right min-w-[80px]">
                                    <div className="text-xl font-bold text-primary">{calculated.calories}</div>
                                    <div className="text-xs text-gray-400">ккал</div>
                                </div>
                            </div>

                            {/* Инфо о макросах */}
                            <div className="flex justify-between bg-gray-50 p-2 rounded-lg text-sm text-gray-600">
                                <span>🥩 {calculated.protein}г</span>
                                <span>🥑 {calculated.fats}г</span>
                                <span>🍚 {calculated.carbs}г</span>
                            </div>

                        </ModalBody>
                        <ModalFooter className="flex justify-between">
                            <Button color="danger" variant="light" onPress={handleDelete}>Удалить</Button>
                            <div className="flex gap-2">
                                <Button variant="flat" onPress={onClose}>Отмена</Button>
                                <Button color="primary" onPress={handleUpdate}>Сохранить</Button>
                            </div>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}