# JMeter load testing

`phonemele-load.jmx` models one user opening the Library and dashboard,
generating a temporary Wordle output, then reading operational metrics. Host,
port, users, ramp, loops and think time are JMeter properties, so the same plan
drives every traffic level without duplicated test logic.

Use Apache JMeter 5.6.3 with Java 8 or newer. Start the application in production
mode, then run CLI mode (not the JMeter GUI):

```powershell
npm run build
npm run start
# In another terminal:
$env:JMETER_EXECUTABLE = 'C:\tools\apache-jmeter-5.6.3\bin\jmeter.bat'
npm run test:load
npm run test:load:staged
```

The safe local staged profile uses five equivalent traffic levels: 1, 10, 25,
50 and 100 users. The assessment-example profile of 1, 10, 100, 1,000 and
10,000 users is also available. Its full command is intentionally explicit
because 1,000/10,000 JMeter threads can exhaust a normal laptop before they
measure the app:

```powershell
npm run test:load:full
```

Run the high stages only on a sized or distributed load-injector environment,
with the local app and machine monitored. Never redirect this plan to a system
you do not own or have explicit permission to test. The runner accepts only
loopback targets and writes timestamped `.jtl`, JMeter log and HTML dashboard
artifacts under the ignored `jmeter/results/` directory.

Override loops/think time or a non-default local port with environment variables:

```powershell
$env:JMETER_LOOPS = '3'
$env:JMETER_THINK_MS = '250'
$env:JMETER_BASE_URL = 'http://127.0.0.1:3001'
npm run test:load:staged
```
