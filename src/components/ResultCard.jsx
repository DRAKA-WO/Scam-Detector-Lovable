import SafeResult from './SafeResult'
import SuspiciousResult from './SuspiciousResult'
import ScamResult from './ScamResult'

function ResultCard({ result, onNewAnalysis, scanId, savedLearnMoreData, fromHistory }) {
  const { classification } = result

  if (classification === 'safe') {
    return (
      <SafeResult
        result={result}
        onNewAnalysis={onNewAnalysis}
      />
    )
  } else if (classification === 'suspicious') {
    return (
      <SuspiciousResult
        result={result}
        onNewAnalysis={onNewAnalysis}
      />
    )
  } else if (classification === 'scam') {
    return (
      <ScamResult
        result={result}
        onNewAnalysis={onNewAnalysis}
        scanId={scanId}
        savedLearnMoreData={savedLearnMoreData}
        fromHistory={fromHistory}
      />
    )
  }

  return null
}

export default ResultCard


