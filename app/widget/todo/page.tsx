'use client';

import { useEffect, useState, useCallback } from 'react';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

interface TodoWidgetProps {
  tasks: Todo[];
}

export default function TodoWidget() {
  const [todos, setTodos] = useState<Todo[]>([]);

  // Expose renderTodos globally for data injection script
  const renderTodos = useCallback((tasks: Todo[]) => {
    setTodos(tasks || []);
  }, []);

  useEffect(() => {
    // Expose renderTodos to window for data injection
    if (typeof window !== 'undefined') {
      (window as any).renderTodos = renderTodos;
    }

    // Method 1: Check window.openai.toolOutput (OpenAI ChatGPT integration)
    const checkOpenAIData = () => {
      if (typeof window !== 'undefined' && (window as any).openai?.toolOutput) {
        const data = (window as any).openai.toolOutput as TodoWidgetProps;
        if (data.tasks) {
          renderTodos(data.tasks);
        }
      }
    };

    // Method 2: Listen for postMessage events
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'structuredContent' && event.data.content?.tasks) {
        renderTodos(event.data.content.tasks);
      }
      if (event.data.type === 'widgetData' && event.data.tasks) {
        renderTodos(event.data.tasks);
      }
    };

    // Initial check
    checkOpenAIData();

    // Poll for data (OpenAI may inject data after mount)
    const interval = setInterval(checkOpenAIData, 100);

    // Listen for messages
    window.addEventListener('message', handleMessage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('message', handleMessage);
      // Clean up global reference
      if (typeof window !== 'undefined') {
        delete (window as any).renderTodos;
      }
    };
  }, [renderTodos]);

  return (
    <div className="p-4 font-sans">
      <h2 className="text-xl font-semibold mb-4">Todo List</h2>

      {todos.length === 0 ? (
        <div className="text-gray-500 text-center py-8">
          No todos yet. Add one to get started!
        </div>
      ) : (
        <ul className="space-y-2">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className={`flex items-center p-3 border rounded-lg ${
                todo.completed
                  ? 'opacity-60 line-through bg-gray-50'
                  : 'bg-white'
              }`}
            >
              <input
                type="checkbox"
                checked={todo.completed}
                disabled
                className="mr-3 h-4 w-4"
              />
              <span>{todo.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
