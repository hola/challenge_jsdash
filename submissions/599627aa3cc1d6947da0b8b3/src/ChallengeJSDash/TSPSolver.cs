using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChallengeJSDash
{
    /*!
 * \brief This structure represents one step of solving.
 *
 *  A tree of such elements will represent the solving process.
 */
    public class SStep
    {
        //! A structure that represents a candidate for branching
        public class SCandidate
        {
            public int nRow = -1; //!< A zero-based row number of the candidate
            public int nCol = -1; //!< A zero-based column number of the candidate

            public bool Equals(SCandidate other)
            {
                return other != null && nRow == other.nRow && nCol == other.nCol;
            }

            public override bool Equals(object obj)
            {
                return Equals(obj as SCandidate);
            }
        };

        //! An enum that describes possible selection of the next step
        public enum NextStep
        {
            NoNextStep, //!< No next step (end of solution)
            LeftBranch, //!< Left branch was selected for the next step
            RightBranch //!< Right branch was selected for the next step
        };

        public double[][] matrix; //!< This step's matrix
        public double price = -1; //!< The price of travel to this step

        public SCandidate candidate = new SCandidate(); //!< A candiadate for branching in the current step
        public List<SCandidate> alts;// = new List<SCandidate>(); //!< A list of alternative branching candidates
        public SStep pNode = null; //!< Pointer to the parent step
        public SStep plNode = null; //!< Pointer to the left branch step
        public SStep prNode = null; //!< Pointer to the right branch step
        public NextStep next = NextStep.NoNextStep; //!< Indicates what branch was selected for the next step
    }

    public class TSPSolver
    {
        private bool mayNotBeOptimal = false, canceled = false, cc = true;
        private int nCities = 0, total = 0;
        private SStep root = null;
        private Dictionary<int, int> route = new Dictionary<int, int>();

        public static string Test()
        {
            var m0 = new int[5, 5] { { -1, 20, 18, 12, 8 }, { 5, -1, 14, 7, 11 }, { 12, 18, -1, 6, 11 }, { 11, 17, 11, -1, 12 }, { 5, 5, 5, 5, -1 } };
            var m1 = new double[m0.GetLength(0)][];
            for (var i = 0; i < m1.Length; i++)
            {
                m1[i] = new double[m1.Length];
                for (var j = 0; j < m1.Length; j++)
                    m1[i][j] = m0[i, j] > 0 ? m0[i, j] : int.MaxValue;
            }
            var obj = new TSPSolver();
            var step = obj.solve(5, m1);
            return obj.getSortedPath("a b c d e f");
        }

        public void cleanup(bool processEvents = false)
        {
            route.Clear();
            mayNotBeOptimal = false;
            if (root != null)
                deleteTree(root, processEvents);
        }

        public static IEnumerable<Method.Path> Process(string[] screen, World world0)
        {
            var dict = new Dictionary<Tuple<int, int>, int>();
            for (var y = 0; y < screen.Length; y++)
                for (var x = 0; x < screen[y].Length; x++)
                    if (screen[y][x] == '*')
                        dict[Tuple.Create(y, x)] = dict.Count;
            var matrix = Enumerable.Range(0, dict.Count)
                .Select(_ => Enumerable.Range(0, dict.Count).Select(__ => double.PositiveInfinity).ToArray())
                .ToArray();
            var isolated = new HashSet<int>();
            foreach (var item in dict.ToArray())
            {
                var src = item.Value;
                var wave = new WaveOld(world0.Clone(), "*", ":*", null);
                wave.Update(item.Key.Item1, item.Key.Item2, true, 0);
                foreach (var scored in wave.Scored)
                {
                    var coord = Tuple.Create(scored.Y, scored.X);
                    if (dict.ContainsKey(coord))
                    {
                        var dst = dict[coord];
                        var val = scored.StepsCount < 20 ? 20 : 10000;
                        matrix[src][dst] = val;
                    }
                }
                if (wave.Scored.Length == 0)
                {
                    dict.Remove(item.Key);
                    isolated.Add(src);
                }
            }
            if (isolated.Count != 0)
                matrix = matrix.Where((x, i) => !isolated.Contains(i))
                    .Select(z => z.Where((x, i) => !isolated.Contains(i)).ToArray())
                    .ToArray();

            //for (var i = 0; i < matrix.Length; i++)
            //    System.Diagnostics.Trace.WriteLine("[" + i + "] " + string.Join(" ", matrix[i]));

            var obj = new TSPSolver();
            var step = obj.solve(dict.Count, cloneFull(matrix));
            var first = obj.route.Keys.Min();
            var prev = first;
            var next = 0;
            var found = false;
            while ((next = obj.getNextRoute(prev, out found)) != first && found)
            {
                yield return new Method.Path { From = prev, To = next, Distance = (int)matrix[prev][next] };
                prev = next;
            }
            if (found)
                yield return new Method.Path { From = prev, To = next, Distance = (int)matrix[prev][next] };
        }

        public static IEnumerable<Method.Path> Process(double[][] matrix)
        {
            var obj = new TSPSolver();
            var step = obj.solve(matrix.Length, cloneFull(matrix));
            if (obj.route.Count <= 0)
                yield break;
            var first = obj.route.Keys.Min();
            var prev = first;
            var next = 0;
            var found = false;
            while ((next = obj.getNextRoute(prev, out found)) != first && found)
            {
                yield return new Method.Path { From = prev, To = next, Distance = (int)matrix[prev][next] };
                prev = next;
            }
            if (found)
                yield return new Method.Path { From = prev, To = next, Distance = (int)matrix[prev][next] };
        }

        private int getNextRoute(int prev, out bool found)
        {
            int value;
            found = route.TryGetValue(prev, out value);
            return found ? value : 0;
        }

        public string getSortedPath(string city, string separator = " -> ")
        {
            if (root == null || route.Count == 0 || route.Count != nCities )
                return "";

            int i = 0; // We start from City 1
            var path = new List<int>();
            path.Add(1);
            //path << city.arg(1);
            while ((i = route[i]) != 0)
            {
                path.Add(i + 1);
                //path << city.arg(i + 1);
            }
            // And finish in City 1, too
            //path << city.arg(1);

            return string.Join(separator, path);
        }

        public int getTotalSteps() { return total; }
        public bool isOptimal() { return !mayNotBeOptimal; }
        public void setCleanupOnCancel(bool enable = true) { cc = enable; }

        private static T[][] cloneFull<T>(T[][] matrix)
        {
            //return matrix;
            var m = new T[matrix.Length][];
            for (var i = 0; i < m.Length; i++)
                m[i] = (T[])matrix[i].Clone();
            return m;
        }
        private static T[][] clone<T>(T[][] matrix)
        {
            return cloneFull(matrix);
            //return matrix;
        }

        public SStep solve(int numCities, double[][] task)
        {
            if (numCities < 3)
                return null;

            //QMutexLocker locker(&mutex);
            cleanup();
            canceled = false;
            //locker.unlock();

            nCities = numCities;

            SStep step = new SStep();
            step.matrix = task;// clone(task);
            // We need to distinguish the values forbidden by the user
            // from the values forbidden by the algorithm.
            // So we replace user's infinities by the maximum available double value.
            normalize(step.matrix);
#if DEBUG
            //qDebug() << step->matrix;
#endif // DEBUG
            step.price = align(step.matrix);
            root = step;

            SStep left, right;
            int nRow, nCol;
            bool firstStep = true;
            double check = double.PositiveInfinity;// INFINITY;
            total = 0;
            while (route.Count < nCities)
            {
                step.alts = findCandidate(step.matrix, out nRow, out nCol);

                while (hasSubCycles(nRow, nCol))
                {
#if DEBUG
                    //qDebug() << "Forbidden: (" << nRow << ";" << nCol << ")";
#endif // DEBUG
                    step.matrix[nRow][nCol] = double.PositiveInfinity;// INFINITY;
                    step.price += align(step.matrix);
                    step.alts = findCandidate(step.matrix, out nRow, out nCol);
                }

#if DEBUG
                //qDebug() /*<< step->matrix*/ << "Selected: (" << nRow << ";" << nCol << ")";
                //qDebug() << "Alternate:" << step->alts;
                //qDebug() << "Step price:" << step->price << endl;
#endif // DEBUG

                //locker.relock();
                if ((nRow == -1) || (nCol == -1) || canceled)
                {
                    if (canceled && cc)
                        cleanup();
                    return null;
                }
                //locker.unlock();

                // Route with (nRow,nCol) path
                right = new SStep();
                right.pNode = step;
                right.matrix = clone(step.matrix);
                for (int k = 0; k < nCities; k++)
                {
                    if (k != nCol)
                        right.matrix[nRow][k] = double.PositiveInfinity;
                    if (k != nRow)
                        right.matrix[k][nCol] = double.PositiveInfinity;
                }
                right.price = step.price + align(right.matrix);
                // Forbid the selected route to exclude its reuse in next steps.
                right.matrix[nCol][nRow] = double.PositiveInfinity;
                right.matrix[nRow][nCol] = double.PositiveInfinity;

                // Route without (nRow,nCol) path
                left = new SStep();
                left.pNode = step;
                left.matrix = clone(step.matrix);
                left.matrix[nRow][nCol] = double.PositiveInfinity;
                left.price = step.price + align(left.matrix);

                step.candidate.nRow = nRow;
                step.candidate.nCol = nCol;
                step.plNode = left;
                step.prNode = right;

                // This matrix is not used anymore. Restoring infinities back.
                denormalize(step.matrix);

                if (right.price <= left.price)
                {
                    // Route with (nRow,nCol) path is cheaper
                    step.next = SStep.NextStep.RightBranch;
                    step = right;
                    route[nRow] = nCol;
                    //emit routePartFound(route.size());
                    if (firstStep)
                    {
                        check = left.price;
                        firstStep = false;
                    }
                }
                else
                {
                    // Route without (nRow,nCol) path is cheaper
                    step.next = SStep.NextStep.LeftBranch;
                    step = left;
                    //QCoreApplication::processEvents();
                    if (firstStep)
                    {
                        check = right.price;
                        firstStep = false;
                    }
                }
                total++;
            }

            mayNotBeOptimal = (check < step.price);

            return root;
        }

        public bool wasCanceled() { return canceled; }

        private double align(double[][] matrix)
        {
            double r = 0;
            double min;
            for (int k = 0; k < nCities; k++)
            {
                min = findMinInRow(k, matrix);
                if (min > 0)
                {
                    r += min;
                    if (min < double.MaxValue)// MAX_DOUBLE)
                        subRow(matrix, k, min);
                }
            }
            for (int k = 0; k < nCities; k++)
            {
                min = findMinInCol(k, matrix);
                if (min > 0)
                {
                    r += min;
                    if (min < double.MaxValue) // MAX_DOUBLE)
                        subCol(matrix, k, min);
                }
            }
            return r != double.MaxValue ? r : double.PositiveInfinity;
            //return (r != int.MaxValue) ? r : 1000000;// int.MaxValue;// INFINITY;
        }

        private void deleteTree(SStep root, bool processEvents = false)
        {
            if (root == null)
                return;
            SStep step = root;
            SStep parent;
            while (true) //forever 
            {
                if (processEvents)
                    ;//QCoreApplication::processEvents(QEventLoop::ExcludeUserInputEvents);
                if (step.plNode != null)
                {
                    // We have left child node - going inside it
                    step = step.plNode;
                    step.pNode.plNode = null;
                    continue;
                }
                else if (step.prNode != null)
                {
                    // We have right child node - going inside it
                    step = step.prNode;
                    step.pNode.prNode = null;
                    continue;
                }
                else
                {
                    // We have no child nodes. Deleting the current one.
                    parent = step.pNode;
                    //delete step;
                    if (parent != null)
                    {
                        // Going back to the parent node.
                        step = parent;
                    }
                    else
                    {
                        // We came back to the root node. Finishing.
                        root = null;
                        break;
                    }
                }
            }
        }

        private void denormalize(double[][] matrix)
        {
            for (int r = 0; r < nCities; r++)
                for (int c = 0; c < nCities; c++)
                    if ((r != c) && (matrix[r][c] == double.MaxValue))// MAX_DOUBLE))
                        matrix[r][c] = double.PositiveInfinity;// INFINITY;
        }

        private List<SStep.SCandidate> findCandidate(double[][] matrix, out int nRow, out int nCol)
        {
            nRow = -1;
            nCol = -1;
            List<SStep.SCandidate> alts = new List<SStep.SCandidate>();
            SStep.SCandidate cand = new SStep.SCandidate();
            double h = -1;
            double sum;
            for (int r = 0; r < nCities; r++)
                for (int c = 0; c < nCities; c++)
                    if (matrix[r][c] == 0)
                    {
                        sum = findMinInRow(r, matrix, c) + findMinInCol(c, matrix, r);
                        if (sum > h)
                        {
                            h = sum;
                            nRow = r;
                            nCol = c;
                            alts.Clear();
                        }
                        else if ((sum == h) && !hasSubCycles(r, c))
                        {
                            cand.nRow = r;
                            cand.nCol = c;
                            alts.Add(cand);
                        }
                    }
            return alts; 
        }

        private double findMinInCol(int nCol, double[][] matrix, int exr = -1)
        {
            double min = double.PositiveInfinity;
            for (int k = 0; k < nCities; k++)
                if (k != exr && min > matrix[k][nCol])// && matrix[k][nCol] != int.MaxValue)
                    min = matrix[k][nCol];
            return double.IsPositiveInfinity(min) ? 0 : min;
            //return (min == int.MaxValue) ? 0 : min;
        }

        private double findMinInRow(int nRow, double[][] matrix, int exc = -1)
        {
            double min = double.PositiveInfinity;
            for (int k = 0; k < nCities; k++)
            {
                if (k != exc && min > matrix[nRow][k])// && matrix[nRow][k] != int.MaxValue)
                    min = matrix[nRow][k];
            }
            return double.IsPositiveInfinity(min) ? 0 : min;
            //return (min == int.MaxValue) ? 0 : min;
        }

        private void finishRoute()
        {
        }

        private bool hasSubCycles(int nRow, int nCol)
        {
            if ((nRow < 0) || (nCol < 0) || route.Count == 0 || !(route.Count < nCities - 1) || !route.ContainsKey(nCol))
                return false;
            int i = nCol;
            while (true) //forever 
            {
                int val = 0;
                if (!route.TryGetValue(i, out val))
                    val = 0;
                i = val;
                if (i == nRow)
                    return true;
                //if ((i = route[i]) == nRow)
                //    return true;
                if (!route.ContainsKey(i))
                    return false;
            }
            return false;
        }

        private void normalize(double[][] matrix)
        {
            for (int r = 0; r < nCities; r++)
                for (int c = 0; c < nCities; c++)
                    if (r != c && double.IsPositiveInfinity(matrix[r][c]))
                        matrix[r][c] = double.MaxValue;
        }

        private void subCol(double[][] matrix, int nCol, double val)
        {
            for (int k = 0; k < nCities; k++)
                if (k != nCol)// && matrix[k][nCol] != int.MaxValue)
                    matrix[k][nCol] -= val;
        }
        private void subRow(double[][] matrix, int nRow, double val)
        {
            for (int k = 0; k < nCities; k++)
                if (k != nRow)// && matrix[nRow][k] != int.MaxValue)
                    matrix[nRow][k] -= val;
        }
    }
}
