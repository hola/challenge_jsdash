using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace ChallengeJSDash
{
    public class Controller
    {
        public Action<Dir> control;
        public Action quit;
        public Action pause;
        public Action<object> error;
        public Action ready;

        public virtual void init() { }
        public virtual void onupdate(string[] screen, World world) { }
        public virtual void destroy() { }

        protected bool is_valid()
        {
            return control != null && quit != null && pause != null && error != null && ready != null;
        }

        public static Dir char2dir(char c)
        {
            switch (c)
            {
                case 'u': return Dir.UP;
                case 'd': return Dir.DOWN;
                case 'r': return Dir.RIGHT;
                case 'l': return Dir.LEFT;
            }
            return Dir.NONE;
        }

    }

    class Keyboard : Controller 
    {
        private Control _control;

        public Keyboard(Control c)        
        {
            _control = c;
            _control.KeyDown += control_KeyDown;
        }

        void control_KeyDown(object sender, KeyEventArgs e)
        {
            if (is_valid())
                switch (e.KeyCode)
                {
                    case Keys.Up: control(Dir.UP); break;
                    case Keys.Down: control(Dir.DOWN); break;
                    case Keys.Left: control(Dir.LEFT); break;
                    case Keys.Right: control(Dir.RIGHT); break;
                    case Keys.Space: control(Dir.NONE); break;
                    case Keys.P: pause(); break;

                    case Keys.Escape:
                    case Keys.Q:
                        quit(); break;
                }
        }
        
        public override void init() { ready(); }
        
        //private void ondata(data)
        //{
        //    let input = data.toString();
        //    let re = /(\x03$|\x1b\[[ABCD]|\x1b$|[pPqQ ])/g;
        //    let m;
        //    while (m = re.exec(input))
        //    {
        //        switch (m[1])
        //        {
        //        case '\x1b[A': this.emit('control', game.UP); break;
        //        case '\x1b[B': this.emit('control', game.DOWN); break;
        //        case '\x1b[C': this.emit('control', game.RIGHT); break;
        //        case '\x1b[D': this.emit('control', game.LEFT); break;
        //        case ' ': this.emit('control', undefined); break;
        //        case 'p': case 'P': this.emit('pause', undefined); break;
        //        case '\x1b': // Esc
        //        case '\x03': // Ctrl-C
        //        case 'q': case 'Q':
        //            this.emit('quit'); break;
        //        }
        //    }
        //}

        public override void destroy()
        {
            _control.KeyDown -= control_KeyDown;
        }
    }

    public interface AI 
    {
        char play(string[] screen, World world);
    }

    public class ProcessAI : Controller 
    {
        private AI _ai;
        //private int _frame = 0;

        public ProcessAI(AI ai)
        {
            _ai = ai;
            //this.script = script;
            //this.wrapper = undefined;
        }

        public override void init()
        {
            //try 
            //{
            //    this.wrapper = loader.load_unsafe(this.script);
            //} 
            //catch (e)
            //{
            //    return this.emit('error', String(e.stack));
            //}
            //this.emit('ready');
            ready();
        }

        public override void onupdate(string[] screen, World world)
        {
            var res = _ai.play(screen, world);
            //System.Diagnostics.Trace.WriteLine("[" + (++_frame) + "]: " + res);
            if (res == 'q')
                quit();
            else
                control(char2dir(res));
            //let res;
            //try {
            //    res = this.wrapper(screen);
            //} catch(e){
            //    return this.emit('error', String(e.stack));
            //}
            //if (res.done || res.value=='q')
            //    this.emit('quit');
            //else
            //    this.emit('control', char2dir(res.value));
        }
    }

}
