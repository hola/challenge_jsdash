using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChallengeJSDash
{
    public static class Utils
    {
        public static V GetDefault<T, V>(this IDictionary<T, V> dict, T key, V defaultValue = default(V))
        {
            V value;
            if (dict.TryGetValue(key, out value))
                return value;
            return defaultValue;
        }

        public static IEnumerable<int[]> FindItem(this string[] screen, string pattern)
        {
            var height = screen.Length;
            var width = screen[0].Length;
            for (var y = 0; y < height; y++)
                for (var x = 0; x < width; x++)
                    if (pattern.Contains(screen[y][x]))
                        yield return new[] { y, x };
        }

        public static string[] SetAt(this string[] screen, int y, int x, char c)
        {
            var arr = screen[y].ToCharArray();
            arr[x] = c;
            screen[y] = new string(arr);
            return screen;
        }
    }
}
