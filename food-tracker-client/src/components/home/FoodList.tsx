import { Card, CardBody, Chip } from "@nextui-org/react";
import { getGradeColor } from "../../utils/helpers";

export default function FoodList({ logs, onItemClick }: { logs: any[], onItemClick: (item: any) => void }) {
  return (
    <div className="px-6 mt-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-700 text-lg">История</h3>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">Сегодня</span>
      </div>

      <div className="flex flex-col gap-3">
          {logs.length === 0 ? (
              <div className="text-center text-gray-400 py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-2xl mb-2">🍽️</p><p>Пока ничего не съедено</p>
              </div>
          ) : (
              logs.map((item) => (
                  <Card key={item.id} isPressable onPress={() => onItemClick(item)} className="shadow-none bg-gray-50 border border-gray-100 hover:bg-gray-100 transition">
                      <CardBody className="flex flex-row justify-between items-center p-3">
                          <div className="flex gap-3 items-center overflow-hidden flex-1">
                              <div className={`min-w-[36px] h-9 rounded-full flex items-center justify-center font-bold text-sm border shadow-sm ${getGradeColor(item.grade)}`}>
                                  {item.grade || "?"}
                              </div>
                              <div className="truncate pr-2">
                                  <p className="font-bold text-sm text-gray-800 truncate">{item.name}</p>
                                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                                      {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </p>
                              </div>
                          </div>
                          <Chip size="sm" variant="flat" color="primary" className="font-bold">{item.calories}</Chip>
                      </CardBody>
                  </Card>
              ))
          )}
      </div>
    </div>
  );
}