import { useState } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaChevronDown, FaChevronUp } from 'react-icons/fa';

interface CheckItem {
  name: string;
  passed: boolean;
  details?: string;
}

interface DetailedReportCardProps {
  title: string;
  score: number;
  details: string;
  status?: string;
  items: CheckItem[];
}

const DetailedReportCard = ({ title, score, details, status, items }: DetailedReportCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
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
  
  // Count passed and failed items
  const passedCount = items.filter(item => item.passed).length;
  const totalCount = items.length;
  
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">{title}</h3>
        <div className="flex items-center">
          {status && (
            <span className={`mr-3 px-2 py-1 rounded text-sm font-medium ${color} bg-opacity-20`}>
              {status}
            </span>
          )}
          <Icon className={`text-2xl ${color}`} />
        </div>
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
      
      <p className="text-textMedium text-sm mb-4">{details}</p>
      
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm">
          <span className="font-medium">{passedCount}/{totalCount}</span> verificações passaram
        </div>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-primary hover:text-primary-dark flex items-center text-sm"
        >
          {isExpanded ? (
            <>
              <span className="mr-1">Ocultar detalhes</span>
              <FaChevronUp />
            </>
          ) : (
            <>
              <span className="mr-1">Ver detalhes</span>
              <FaChevronDown />
            </>
          )}
        </button>
      </div>
      
      {isExpanded && (
        <div className="mt-4 border-t pt-4">
          <ul className="space-y-3">
            {items.map((item, index) => (
              <li key={index} className="flex">
                <div className="mr-3 mt-0.5">
                  {item.passed ? (
                    <FaCheckCircle className="text-green-500" />
                  ) : (
                    <FaTimesCircle className="text-red-500" />
                  )}
                </div>
                <div>
                  <h4 className="font-medium">{item.name}</h4>
                  {item.details && <p className="text-sm text-textMedium">{item.details}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DetailedReportCard;
