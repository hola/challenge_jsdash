using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChallengeJSDash
{
    public class Method
    {
        private int _len;
        private int[,] _dist;
        private int[,] _clone;
        private int[] _x;
        private int[] _y;

        public Method(int[,] dist)//, int[] x, int[] y)
        {
            _dist = (int[,])dist.Clone();
            _clone = (int[,])_dist.Clone();
            _len = _dist.GetLength(0);
            _x = Enumerable.Range(0, _len).ToArray();
            _y = Enumerable.Range(0, _len).ToArray();
            for (var i = 0; i < _len; i++)
                _dist[i, i] = -1;
        }

        private void ReduceRow(int index)
        {
            var min = int.MaxValue;
            for (var i = 0; i < _len; i++)
                if (_dist[index, i] != -1)
                    min = Math.Min(min, _dist[index, i]);
            if (min != int.MaxValue)
                for (var i = 0; i < _len; i++)
                    if (_dist[index, i] != -1)
                        _dist[index, i] -= min;
        }

        private void ReduceColumn(int index)
        {
            var min = int.MaxValue;
            for (var i = 0; i < _len; i++)
                if (_dist[i, index] != -1)
                    min = Math.Min(min, _dist[i, index]);
            if (min != int.MaxValue)
                for (var i = 0; i < _len; i++)
                    if (_dist[i, index] != -1)
                        _dist[i, index] -= min;
        }

        private void ReduceRowsAndColums()
        {
            for (var i = 0; i < _len; i++)
                ReduceRow(i);
            for (var i = 0; i < _len; i++)
                ReduceColumn(i);
        }

        private int[] ProcessZeroCells()
        {
            var max = int.MinValue;
            var imax = -1;
            var jmax = -1;
            for (var i0 = 0; i0 < _len; i0++)
                for (var j0 = 0; j0 < _len; j0++)
                    if (_dist[i0, j0] == 0)
                    {
                        var rowMin = int.MaxValue;
                        for (var j = 0; j < _len; j++)
                            if (j != j0 && _dist[i0, j] != -1)
                                rowMin = Math.Min(rowMin, _dist[i0, j]);
                        var columnMin = int.MaxValue;
                        for (var i = 0; i < _len; i++)
                            if (i != i0 && _dist[i, j0] != -1)
                                columnMin = Math.Min(columnMin, _dist[i, j0]);
                        var value = int.MinValue;
                        if (rowMin == int.MaxValue)
                            value = columnMin;
                        else if (columnMin == int.MaxValue)
                            value = rowMin;
                        else
                            value = rowMin + columnMin;
                        if (value == int.MaxValue) 
                            value = int.MinValue;
                        if (value > max)
                        {
                            max = value;
                            imax = i0;
                            jmax = j0;
                        }
                    }
            //return new[] { _x[imax], _y[jmax], max };
            return imax != -1 ? new[] { imax, jmax, max } : null;
        }

        private void ReduceMatrix(int i0, int j0)
        {
            _clone[i0, j0] = -1;
            {
                var xx = _x.ToList().IndexOf(_y[j0]);
                var yy = _y.ToList().IndexOf(_x[i0]);
                if (xx != -1 && yy != -1)
                    _clone[xx, yy] = -1;
            }
            _len--;
            var dist = new int[_len, _len];
            var x = new int[_len];
            var y = new int[_len];
            for (var i = 0; i < _len; i++)
            {
                x[i] = _x[i + (i < i0 ? 0 : 1)];
                y[i] = _y[i + (i < j0 ? 0 : 1)];
                for (var j = 0; j < _len; j++)
                    dist[i, j] = _clone[i < i0 ? i : i + 1, j < j0 ? j : j + 1];
            }
            _dist = dist;
            _clone = (int[,])_dist.Clone();
            _x = x;
            _y = y;
        }

        public class Path
        {
            public int From;
            public int To;
            public int Distance;

            public override string ToString()
            {
                return string.Format("{0}-{1}: {2}", From, To, Distance);
            }
        }

        public static IEnumerable<Path> Process(int[,] matrix)
        {
            var distance = (int[,])matrix.Clone();
            var obj = new Method(matrix);
            while (obj._len > 2)
            {
                obj.ReduceRowsAndColums();
                var best = obj.ProcessZeroCells();
                if (best != null)
                {
                    var x = obj._x[best[0]];
                    var y = obj._y[best[1]];
                    yield return new Path { From = x, To = y, Distance = distance[x, y] };
                    obj.ReduceMatrix(best[0], best[1]);
                }
                else
                    break;
            }
        }

        public static Path[] Process(string[] screen, World world)
        {
            var dict = new Dictionary<Tuple<int,int>, int>();
            for (var y = 0; y < screen.Length; y++)
                for (var x = 0; x < screen[y].Length; x++)
                    if (screen[y][x] == '*')
                        dict[Tuple.Create(y, x)] = dict.Count;
            var matrix = new int[dict.Count, dict.Count];
            for (var i = 0; i < dict.Count; i++)
                for (var j = 0; j < dict.Count; j++)
                    matrix[i, j] = -1;
            foreach (var item in dict)
            {
                var src = item.Value;
                var wave = new WaveOld(world.Clone(), "*", ":*", null);
                wave.Update(item.Key.Item1, item.Key.Item2, true, 0);
                foreach (var scored in wave.Scored)
                {
                    var coord = Tuple.Create(scored.Y, scored.X);
                    var dst = dict[coord];
                    matrix[src, dst] = scored.StepsCount;
                }
            }
            return Process(matrix).ToArray();
        }

        public static Path[] Test()
        {
            //var matrix = new int[4, 4] { { -1, 5, 11, 9 }, { 10, -1, 8, 7 }, { 7, 14, -1, 8 }, { 12, 6, 15, -1 } };
            var matrix = new int[5, 5] { { -1, 20, 18, 12, 8 }, { 5, -1, 14, 7, 11 }, { 12, 18, -1, 6, 11 }, { 11, 17, 11, -1, 12 }, { 5, 5, 5, 5, -1 } };
            var res = Process(matrix).ToArray();
            return res;
        }
    }
}
