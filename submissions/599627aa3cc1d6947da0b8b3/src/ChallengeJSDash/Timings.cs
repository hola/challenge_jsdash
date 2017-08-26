using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Collections.Concurrent;

namespace ChallengeJSDash
{
    public static class Timings
    {
        public class Object
        {
            private int _id;
            private System.Diagnostics.Stopwatch _watch = new System.Diagnostics.Stopwatch();

            public Object(int id)
            {
                _id = id;
                _watch.Start();
            }

            public void Stop()
            {
                _watch.Stop();
                AddTime(_id, _watch.Elapsed.TotalMilliseconds);
                //_watch.Elapsed.TotalMilliseconds;
                //Timings.a
            }
        }

        static Timings()
        {
            Clear();
        }

        private static ConcurrentBag<double>[] _times;

        public static Object Start(int id)
        {
            return new Object(id);
        }

        private static void AddTime(int id, double time)
        {
            _times[id].Add(time);
        }

        public static void Clear()
        {
            _times = Enumerable.Range(0, 100).Select(x => new ConcurrentBag<double>()).ToArray();
        }

        public static string[] ToString()
        {
            return _times.Where(x => x.Count != 0)
                .Select((times, id) =>
                {
                    var total = times.Sum();
                    var max = times.Max();
                    var avg = times.Average();
                    var std = Math.Sqrt(times.Average(x => Math.Pow(x - avg, 2)));
                    return string.Format("[{0}] N: {1} total: {2:#0.000000} avg: {3:#0.000000} std: {4:#0.000000} max: {5:#0.000000}", id, times.Count, total, avg, std, max);
                })
                .ToArray();
        }
    }
}
