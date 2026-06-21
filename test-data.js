const testData = {
  gameType: 'memory_matrix',
  gameName: '记忆矩阵',
  timestamp: new Date().toISOString(),
  totalRounds: 10,
  completedRounds: 10,
  logs: [
    {round:1,gridSize:3,targetCount:3,targets:[0,4,7],startTime:1000,showTime:2000,difficulty:'easy',recallStartTime:3000,clicks:[{idx:0,col:0,row:0,isCorrect:true,rt:520},{idx:4,col:1,row:1,isCorrect:true,rt:830},{idx:7,col:1,row:2,isCorrect:true,rt:1100}],hits:3,misses:0,falseAlarms:0,accuracy:1,totalRecallTime:2450},
    {round:2,gridSize:3,targetCount:3,targets:[1,3,8],startTime:5000,showTime:1800,difficulty:'easy',recallStartTime:6800,clicks:[{idx:1,col:1,row:0,isCorrect:true,rt:410},{idx:3,col:0,row:1,isCorrect:true,rt:780}],hits:2,misses:1,falseAlarms:0,accuracy:0.67,totalRecallTime:1190},
    {round:3,gridSize:3,targetCount:4,targets:[0,2,4,6],startTime:9000,showTime:1800,difficulty:'medium',recallStartTime:10800,clicks:[{idx:0,col:0,row:0,isCorrect:true,rt:340},{idx:2,col:2,row:0,isCorrect:true,rt:560},{idx:4,col:1,row:1,isCorrect:true,rt:890},{idx:6,col:0,row:2,isCorrect:true,rt:1200}],hits:4,misses:0,falseAlarms:0,accuracy:1,totalRecallTime:2990},
    {round:4,gridSize:4,targetCount:4,targets:[1,5,9,14],startTime:13000,showTime:1600,difficulty:'medium',recallStartTime:14600,clicks:[{idx:1,col:1,row:0,isCorrect:true,rt:420},{idx:5,col:1,row:1,isCorrect:true,rt:650},{idx:9,col:1,row:2,isCorrect:true,rt:980},{idx:14,col:2,row:3,isCorrect:true,rt:1350}],hits:4,misses:0,falseAlarms:0,accuracy:1,totalRecallTime:3400},
    {round:5,gridSize:4,targetCount:5,targets:[0,3,7,10,15],startTime:17000,showTime:1600,difficulty:'medium',recallStartTime:18600,clicks:[{idx:0,col:0,row:0,isCorrect:true,rt:380},{idx:3,col:3,row:0,isCorrect:true,rt:520},{idx:7,col:3,row:1,isCorrect:true,rt:760},{idx:10,col:2,row:2,isCorrect:true,rt:1100},{idx:15,col:3,row:3,isCorrect:true,rt:1400}],hits:5,misses:0,falseAlarms:0,accuracy:1,totalRecallTime:4160}
  ],
  summary: {
    totalHits: 18,
    totalMisses: 1,
    totalFalseAlarms: 0,
    avgAccuracy: 93,
    avgRecallTime: 2840,
    finalDifficulty: 'medium'
  }
};
localStorage.setItem('brainGameResults', JSON.stringify(testData));
location.reload();
