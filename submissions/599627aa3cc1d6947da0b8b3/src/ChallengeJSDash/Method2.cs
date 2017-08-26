using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChallengeJSDash
{
    class Method2
    {
        private List<int[]> FinalMatrix = new List<int[]>();
        private int[][] ReducedMatrix;
        private int[][] Graph;

        public static int[][] Process(int[,] matrix)
        {
            var len = matrix.GetLength(0);
            var obj = new Method2();
            obj.Graph = new int[len][];
            for (var i = 0; i < len; i++)
            {
                obj.Graph[i] = new int[len];
                for (var j = 0; j < len; j++)
                    obj.Graph[i][j] = matrix[i, j];
            }
            obj.TSP(len);
            obj.TSP(len);
            return obj.FinalMatrix.ToArray();
        }

        public static int[][] Test()
        {
            var matrix = new int[5, 5] { { -1, 20, 18, 12, 8 }, { 5, -1, 14, 7, 11 }, { 12, 18, -1, 6, 11 }, { 11, 17, 11, -1, 12 }, { 5, 5, 5, 5, -1 } };
            return Process(matrix);
        }

        private int TSP(int cities) //, double timeBound)
        {
            int totalCost = 0;
            //this.FinalMatrix = new ArrayList(20);
            /*
                 * The ReducedCostMatrix calculates the reduced
                 * cost matrix
                 * */
            totalCost = this.ReducedCostMatrix(cities);
            /*
                * Now we would work on the reduced cost
                 * Matrix to check which nodes to be inluded
                 * yet or not.
                 * */
            int l, m, count = 0;
            for (int i = 0; i < cities; i++)
                for (int j = 0; j < cities; j++)
                {
                    int[][] tempReduceRow = new int[cities][];
                    for (l = 0; l < cities; l++)
                        tempReduceRow[l] = new int[cities];
                    for (l = 0; l < cities; l++)
                        for (m = 0; m < cities; m++)
                            tempReduceRow[l][m] = this.ReducedMatrix[l][m];

                    int[][] tempReduceCol = new int[cities][];
                    for (l = 0; l < cities; l++)
                        tempReduceCol[l] = new int[cities];
                    for (l = 0; l < cities; l++)
                        for (m = 0; m < cities; m++)
                            tempReduceCol[l][m] = this.ReducedMatrix[l][m];
                    /*
                     * We only include those edges with value 0.
                     * Now, we will have only those with minimum left
                     * child and maximum right child.
                     * */
                    if (this.ReducedMatrix[i][j] == 0)
                    {
                        OmitLeft(i, j, tempReduceRow);

                        int LBound = totalCost + this.ReducedCostMatrix(cities, tempReduceRow);
                        OmitRight(i, j, tempReduceCol);
                        int RBound = totalCost + this.ReducedCostMatrix(cities, tempReduceCol);
                        this.FinalMatrix.Add(new int[] { LBound, RBound, 65 + (count++) });
                    }
                }
            this.Sort();
            return totalCost;
        }

        private void Sort()
        {
            int[] values = new int[3];
            int[] a = new int[3];
            int count = 0;
            values = (int[])this.FinalMatrix[0];
            int i = 0;
            int prevIndex = 0;
            for (i = 0; i < this.FinalMatrix.Count; i++)
                for (int j = 0; j < this.FinalMatrix.Count; j++)
                {
                    a = (int[])this.FinalMatrix[j];
                    if (a[1] > values[1] || a[0] < values[0])
                    {
                        this.FinalMatrix[prevIndex] = this.FinalMatrix[j];
                        this.FinalMatrix[j] = values;
                        values = a;
                        prevIndex = j;
                    }
                }
        }

        private void OmitLeft(int row, int col, int[][] temp)
        {
            for (int j = 0; j < temp.Length; j++)
                temp[row][j] = -1;
            for (int j = 0; j < temp.Length; j++)
                temp[j][col] = -1;
        }

        private void OmitRight(int row, int col, int[][] temp)
        {
            temp[row][col] = -1;
        }

        private int ReducedCostMatrix(int cities)
        {
            int minBound = 0;
            this.ReducedMatrix = new int[cities][];
            for (int i = 0; i < cities; i++)
                ReducedMatrix[i] = new int[cities];
            /*
             * Here we make a new Reduced Matrix
             * by copying the original matrix
             * into the new one.
             * */
            for (int i = 0; i < cities; i++)
                for (int j = 0; j < cities; j++)
                    this.ReducedMatrix[i][j] = this.Graph[i][j];
            minBound = this.ReducedRows(cities);
            minBound += this.ReducedCols(cities);
            return minBound;
        }

        private int ReducedCostMatrix(int cities, int[][] temp)
        {
            int minBound = 0;
            minBound = this.ReducedRows(cities, temp);
            minBound += this.ReducedCols(cities, temp);
            return minBound;
        }

        private int ReducedRows(int cities)
        {
            int min = 65535;
            bool flag = false;
            int minBound = 0;
            for (int i = 0; i < cities; i++)
            {
                min = 65535;
                for (int j = 0; j < cities; j++)
                    if (this.ReducedMatrix[i][j] < min && this.ReducedMatrix[i][j] != -1)
                    {
                        min = this.ReducedMatrix[i][j];
                        flag = true;
                    }
                if (flag)
                {
                    this.SubtractRow(i, min);
                    minBound += min;
                }
            }
            return minBound;
        }
        private int ReducedRows(int cities, int[][] temp)
        {
            int min = 65535;
            int minBound = 0;
            for (int i = 0; i < cities; i++)
            {
                min = 65535;
                bool flag = true;
                for (int j = 0; j < cities; j++)
                    if (temp[i][j] < min && temp[i][j] != -1)
                    {
                        min = temp[i][j];
                        flag = false;
                    }
                if (!flag)
                {
                    this.SubtractRow(i, min, temp);
                    minBound += min;
                }
            }
            return minBound;
        }
        private int ReducedCols(int cities)
        {
            int min = 65535;
            int minBound = 0;
            for (int j = 0; j < cities; j++)
            {
                for (int i = 0; i < cities; i++)
                    if (this.ReducedMatrix[i][j] < min && this.ReducedMatrix[i][j] != -1)
                        min = this.ReducedMatrix[i][j];
                this.SubtractCol(j, min);
                minBound += min;
            }
            return minBound;
        }

        private int ReducedCols(int cities, int[][] temp)
        {
            int min = 65535;
            int minBound = 0;
            for (int j = 0; j < cities; j++)
            {
                for (int i = 0; i < cities; i++)
                    if (temp[i][j] < min && temp[i][j] != -1)
                        min = temp[i][j];
                this.SubtractCol(j, min, temp);
                minBound += min;
            }
            return minBound;
        }
        private void SubtractRow(int row, int sub)
        {
            for (int j = 0; j < this.ReducedMatrix[0].Length; j++)
                if (this.ReducedMatrix[row][j] == -1)
                    continue;
                else
                    this.ReducedMatrix[row][j] -= sub;
        }

        private void SubtractRow(int row, int sub, int[][] temp)
        {
            for (int j = 0; j < temp[0].Length; j++)
                if (temp[row][j] == -1)
                    continue;
                else
                    temp[row][j] -= sub;
        }
        private void SubtractCol(int col, int sub)
        {
            for (int j = 0; j < this.ReducedMatrix[0].Length; j++)
                if (this.ReducedMatrix[j][col] == -1)
                    continue;
                else
                    this.ReducedMatrix[j][col] -= sub;

        }
        private void SubtractCol(int col, int sub, int[][] temp)
        {
            for (int j = 0; j < temp.Length; j++)
                if (temp[j][col] == -1)
                    continue;
                else
                    temp[j][col] -= sub;

        }

    }
}
