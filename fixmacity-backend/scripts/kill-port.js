const { execSync } = require('child_process');

try {
  const port = 5005;
  console.log(`Checking if port ${port} is in use...`);
  
  if (process.platform === 'win32') {
    const output = execSync(`netstat -ano | findstr :${port}`).toString();
    const lines = output.trim().split('\n');
    const pids = new Set();
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      // Usually format is: TCP    0.0.0.0:5005      0.0.0.0:0              LISTENING       12345
      if (parts.length >= 5 && parts[1].includes(`:${port}`)) {
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(parseInt(pid, 10)) && pid !== '0') {
          pids.add(pid);
        }
      }
    }
    
    for (const pid of pids) {
      console.log(`Killing process ${pid} using port ${port}...`);
      try {
        execSync(`taskkill /F /PID ${pid}`);
      } catch (e) {
        console.error(`Failed to kill process ${pid}: ${e.message}`);
      }
    }
  } else {
    try {
      execSync(`lsof -ti:${port} | xargs kill -9`);
    } catch (e) {
      // lsof returns error code if nothing found, ignore
    }
  }
} catch (e) {
  // It's okay if netstat finds nothing, or if any error occurs
}
