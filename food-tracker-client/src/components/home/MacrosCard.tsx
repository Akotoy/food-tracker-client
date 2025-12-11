import { Card, CardBody, Progress } from "@nextui-org/react";

export default function MacrosCard({ current, goals }: { current: any, goals: any }) {
  return (
    <div className="px-6 mt-8">
      <h3 className="font-bold text-gray-700 text-lg mb-2">Макронутриенты</h3>
      <Card className="shadow-sm border border-gray-100">
        <CardBody className="gap-4 py-4">
          <div className="grid grid-cols-3 gap-4">
              <MacroItem label="🥩 Белки" current={current.protein} goal={goals.protein} color="primary" />
              <MacroItem label="🥑 Жиры" current={current.fats} goal={goals.fats} color="warning" />
              <MacroItem label="🍚 Угли" current={current.carbs} goal={goals.carbs} color="success" />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

const MacroItem = ({ label, current, goal, color }: any) => (
    <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">{label}</span>
        <Progress size="sm" color={color} value={(current / goal) * 100} />
        <span className="text-[10px] font-bold text-gray-700">{current}/{goal}г</span>
    </div>
);