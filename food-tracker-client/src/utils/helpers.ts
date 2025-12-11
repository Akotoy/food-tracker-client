export const getGradeColor = (grade?: string) => {
    if (!grade) return "bg-gray-200 text-gray-500";
    switch (grade) {
        case 'A': return "bg-green-100 text-green-700 border-green-200";
        case 'B': return "bg-yellow-100 text-yellow-700 border-yellow-200";
        case 'C': return "bg-orange-100 text-orange-700 border-orange-200";
        case 'D': return "bg-red-100 text-red-700 border-red-200";
        default: return "bg-gray-100 text-gray-600";
    }
};