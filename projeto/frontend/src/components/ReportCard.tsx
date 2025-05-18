import { FaCheckCircle, FaExclamationTriangle, FaTimesCircle } from 'react-icons/fa'

interface ReportCardProps {
  title: string;
  score: number;
  details: string;
}

const ReportCard = ({ title, score, details }: ReportCardProps) => {
  // Determine color and icon based on score
  let color = '';
  let Icon = null;
  
  if (score >= 80) {
    color = 'text-green-500';
    Icon = FaCheckCircle;
  } else if (score >= 50) {
    color = 'text-yellow-500';
    Icon = FaExclamationTriangle;
  } else {
    color = 'text-red-500';
    Icon = FaTimesCircle;
  }
  
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">{title}</h3>
        <Icon className={`text-2xl ${color}`} />
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <span>Score</span>
          <span className={`font-bold ${color}`}>{score}/100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${score}%` }}
          ></div>
        </div>
      </div>
      
      <p className="text-textMedium text-sm">{details}</p>
    </div>
  )
}

export default ReportCard
