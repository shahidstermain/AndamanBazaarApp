
import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, where } from 'firebase/firestore';
import {
    CheckCircle2,
    Circle,
    Plus,
    Trash2,
    ClipboardList,
    Loader2
} from 'lucide-react';
import { useToast } from '../components/Toast';

interface Todo {
    id: string;
    title: string;
    is_completed: boolean;
    created_at: string;
}

export const Todos: React.FC = () => {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [newTodo, setNewTodo] = useState('');
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const { showToast } = useToast();

    const fetchTodos = async () => {
        try {
            const user = auth.currentUser;
            if (!user) { setLoading(false); return; }
            const snap = await getDocs(
                query(collection(db, 'todos'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'))
            );
            setTodos(snap.docs.map(d => ({
                id: d.id,
                title: d.data().title,
                is_completed: d.data().isCompleted,
                created_at: d.data().createdAt?.toDate?.()?.toISOString() || '',
            })));
        } catch (err: any) {
            console.error('Error fetching todos:', err.message);
            showToast('Failed to fetch todos: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTodos();
    }, []);

    const handleAddTodo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTodo.trim()) return;
        const user = auth.currentUser;
        if (!user) return;

        setAdding(true);
        try {
            const docRef = await addDoc(collection(db, 'todos'), {
                title: newTodo.trim(),
                isCompleted: false,
                userId: user.uid,
                createdAt: serverTimestamp(),
            });
            setTodos([{ id: docRef.id, title: newTodo.trim(), is_completed: false, created_at: new Date().toISOString() }, ...todos]);
            setNewTodo('');
            showToast('Task added successfully', 'success');
        } catch (err: any) {
            showToast('Failed to add task: ' + err.message, 'error');
        } finally {
            setAdding(false);
        }
    };

    const toggleTodo = async (id: string, isCompleted: boolean) => {
        try {
            await updateDoc(doc(db, 'todos', id), { isCompleted: !isCompleted });
            setTodos(todos.map(t => t.id === id ? { ...t, is_completed: !isCompleted } : t));
        } catch (err: any) {
            showToast('Failed to update task: ' + err.message, 'error');
        }
    };

    const deleteTodo = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'todos', id));
            setTodos(todos.filter(t => t.id !== id));
            showToast('Task deleted', 'success');
        } catch (err: any) {
            showToast('Failed to delete task: ' + err.message, 'error');
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-8">
            <div className="bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-100">
                <div className="bg-ocean-700 p-8 text-white">
                    <div className="flex items-center space-x-3 mb-2">
                        <ClipboardList className="h-8 w-8 text-coral-400" />
                        <h1 className="text-3xl font-heading font-black tracking-tight">Project Tasks</h1>
                    </div>
                    <p className="text-ocean-100 text-sm opacity-80">Manage your AndamanBazaar development list</p>
                </div>

                <div className="p-6 md:p-8">
                    <form onSubmit={handleAddTodo} className="flex gap-3 mb-8">
                        <input
                            type="text"
                            value={newTodo}
                            onChange={(e) => setNewTodo(e.target.value)}
                            placeholder="What needs to be done?"
                            className="flex-1 p-4 bg-slate-50 border-2 border-transparent focus:border-ocean-500 focus:bg-white rounded-2xl outline-none font-bold transition-all shadow-inner"
                        />
                        <button
                            type="submit"
                            disabled={adding || !newTodo.trim()}
                            className="bg-coral-500 hover:bg-coral-600 disabled:opacity-50 text-white p-4 rounded-2xl transition-all shadow-lg active:scale-95"
                        >
                            {adding ? <Loader2 className="animate-spin" size={24} /> : <Plus size={24} />}
                        </button>
                    </form>

                    {loading ? (
                        <div className="flex flex-col items-center py-12 text-slate-400">
                            <Loader2 className="animate-spin h-10 w-10 mb-4" />
                            <p className="font-bold uppercase tracking-widest text-[10px]">Synchronizing with Island Database...</p>
                        </div>
                    ) : todos.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                            <div className="bg-white p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-md">
                                <ClipboardList className="text-slate-300" size={32} />
                            </div>
                            <p className="text-slate-500 font-bold">No tasks found</p>
                            <p className="text-slate-400 text-xs mt-1">Start by adding a todo above</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {todos.map((todo) => (
                                <div
                                    key={todo.id}
                                    className={`group flex items-center p-4 rounded-2xl border-2 transition-all duration-300 ${todo.is_completed ? 'bg-slate-50 border-transparent opacity-60' : 'bg-white border-slate-100 shadow-sm hover:shadow-md hover:border-ocean-200'
                                        }`}
                                >
                                    <button
                                        onClick={() => toggleTodo(todo.id, todo.is_completed)}
                                        className="mr-4 text-ocean-600 transition-transform active:scale-125"
                                    >
                                        {todo.is_completed ? (
                                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                                        ) : (
                                            <Circle className="h-6 w-6 text-slate-300 group-hover:text-ocean-400" />
                                        )}
                                    </button>

                                    <span className={`flex-1 font-bold text-slate-700 transition-all ${todo.is_completed ? 'line-through text-slate-400' : ''
                                        }`}>
                                        {todo.title}
                                    </span>

                                    <button
                                        onClick={() => deleteTodo(todo.id)}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-coral-500 hover:bg-coral-50 rounded-xl transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-8 bg-blue-50 p-6 rounded-[32px] border border-blue-100">
                <h3 className="text-blue-700 font-black text-[10px] uppercase tracking-widest mb-2 flex items-center">
                    <Plus size={12} className="mr-2" /> Database Setup Hint
                </h3>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                    Ensure your Firestore project has a <code className="bg-white/50 px-1 rounded">todos</code> collection protected by rules scoped to <code className="bg-white/50 px-1 rounded">request.auth.uid</code>.
                    <br />
                    <code className="block mt-2 bg-slate-900 text-slate-300 p-3 rounded-xl text-[10px] font-mono whitespace-pre overflow-x-auto">
                        {"{\n  title: string,\n  isCompleted: boolean,\n  userId: string,\n  createdAt: serverTimestamp()\n}"}
                    </code>
                </p>
            </div>
        </div>
    );
};
