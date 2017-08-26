Base approach is simulation and choosing the best solution we could find. First 70 seconds
of total time is spent for searching a solution. The latest 50 seconds is used for playing
the solution we found.

The solution is very sensitive to accuracy of simulation. It also is very sensitive to missing
any frame at the playing phase.

It uses random numbers, so it produces different results for running on same test case.

submission.js — submission file.
submission_debug.js — debugging version of the solution. It checks if simulation and scoring
are accurate.