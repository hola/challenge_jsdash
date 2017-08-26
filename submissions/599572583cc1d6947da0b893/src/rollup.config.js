import cleanup from 'rollup-plugin-cleanup'

export default {
    entry: 'src/main.js',
    format: 'cjs',
    dest: 'bundle.js',
    plugins: [
        cleanup()
    ]
};