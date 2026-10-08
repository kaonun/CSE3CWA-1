# Load-test method and baseline

The JMeter 5.6.3 plan models one complete operational cycle per user:

1. open the teacher Library;
2. open the reporting dashboard;
3. generate a temporary Wordle output; and
4. read the database-backed metrics endpoint.

Each user performs one iteration with 100 ms think time before each request.
Every HTTP response must remain successful for JMeter to report a zero-error
stage. The plan is parameterised rather than copied, so every stage exercises
the same requests and assertions.

## Local production baseline

Measured on 8 October 2026 against the Next.js standalone production build on
loopback, using an isolated freshly migrated SQLite database. The load injector
and application ran on the same Windows workstation, so the results are a local
baseline rather than a public capacity guarantee.

| Users | Samples | Errors | Mean | p95 | p99 | Throughput |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 4 | 0 | 37.8 ms | 72.0 ms | 72.0 ms | 8.4 req/s |
| 10 | 40 | 0 | 9.2 ms | 15.0 ms | 25.0 ms | 32.7 req/s |
| 25 | 100 | 0 | 9.0 ms | 16.0 ms | 27.0 ms | 31.2 req/s |
| 50 | 200 | 0 | 8.4 ms | 13.0 ms | 20.9 ms | 38.2 req/s |
| 100 | 400 | 0 | 8.7 ms | 13.0 ms | 21.0 ms | 39.1 req/s |

The first stage includes cold request/setup cost, which explains its higher
latency and lower throughput. After warm-up, the application remained stable
through 100 local users: all 744 measured requests succeeded, mean latency stayed
below 10 ms, and p95 stayed at or below 16 ms. Throughput levels near 39 requests
per second because ramp-up and deliberate think time pace this workflow; this is
not a saturation test.

These results support the conclusion that the current local single-instance
architecture handles the tested classroom-scale profile without errors. They do
not justify extrapolating to internet deployment or independently scaled SQLite
replicas. The committed CSV contains the exact rounded baseline values.

## High-load profile

The runner also defines the assessment-example levels of 1, 10, 100, 1,000 and
10,000 users. The 1,000/10,000 stages were not executed on the development laptop:
standard JMeter uses one Java thread per simulated user, so the injector can run
out of memory before measuring the application. Run `npm run test:load:full` only
on sized or distributed load injectors after tuning Java heap, operating-system
limits and application monitoring. This limitation should be stated in the video
rather than presenting unsafe or fabricated high-load results.

See [`jmeter/README.md`](../jmeter/README.md) for commands and safety controls.
