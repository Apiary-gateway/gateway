import { useState, useEffect, useRef } from 'react';
import {
    getConfig,
    submitConfig,
} from '../services/config.service';
import Editor, { OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { configSchema } from '../types/config.types';
import { ZodError } from 'zod';

interface ConfigProps {
  onClose: () => void;
}

const Config = ({ onClose }: ConfigProps) => {
    const [configJson, setConfigJson] = useState<string>('');
    const [newConfigJson, setNewConfigJson] = useState<string>('');
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notification, setNotification] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);
    const [zodNotification, setZodNotification] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

    const handleEditorMount: OnMount = (editor) => {
      editorRef.current = editor;
    };

    useEffect(() => {
        const fetchConfig = async () => {
        try {
            const data = await getConfig();
            const formatted = JSON.stringify(data, null, 2);
            setConfigJson(formatted);
            setNewConfigJson(formatted);
        } catch (err) {
            setNotification({
            type: 'error',
            message: 'Failed to fetch config',
            });
        } finally {
            setIsLoading(false);
        }
        };

        fetchConfig();
    }, []);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const checkForConfigErrors = async () => {
        const model = editorRef.current?.getModel();
        try {
            const parsed = JSON.parse(newConfigJson);
            configSchema.parse(parsed);
            
            if (model) monaco.editor.setModelMarkers(model, 'zod', []);
            return true;
        } catch (err) {
            if (err instanceof ZodError && model) {

                const markers = err.errors.map((zodErr: any) => ({
                    message: zodErr.message,
                    severity: monaco.MarkerSeverity.Error,
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: 1,
                    endColumn: 1,
                }))

                monaco.editor.setModelMarkers(model, 'zod', markers);

                setZodNotification({
                  type: 'error',
                  message: `Validation error: ${err.errors[0].path.join('.')} – ${err.errors[0].message}`,
                });
              } else {
                setZodNotification({
                  type: 'error',
                  message: 'Invalid JSON format',
                });
              }

            return false;
        }
    }

    const handleSubmit = async () => {
        if (!await checkForConfigErrors()) return;

        setIsEditing(false);
        setIsSubmitting(true);
        setNotification(null);
        setZodNotification(null);

        try {
            const parsed = JSON.parse(newConfigJson);
            await submitConfig(JSON.stringify(parsed));
            setConfigJson(newConfigJson);
            setNotification({
                type: 'success',
                message: 'Config updated successfully',
            });
        } catch (err) {
            setNotification({
                type: 'error',
                message: 'Failed to update config',
            });
        } finally {
            setIsSubmitting(false);

        }
    };

    const handleCancel = async () => {
        setIsEditing(false);
        setNotification(null);
        setZodNotification(null);
        setNewConfigJson(configJson);
    };

    return (
        <div className="config-container">
        <h2>Manage Configuration Object</h2>
        {notification && (
            <div className={`notification ${notification.type}`}>
            {notification.message}
            </div>
        )}
        {zodNotification && (
            <div className={`notification ${zodNotification.type}`}>
            {zodNotification.message}
            </div>
        )}
        {(isLoading || isSubmitting) && (
            <div className="modal-loading-overlay">
            <div className="spinner"></div>
            </div>
        )}
        {(isEditing ? (
            <Editor
            height="50vh"
            defaultLanguage="json"
            defaultValue={newConfigJson}
            onChange={(value) => setNewConfigJson(value || '')}
            onMount={handleEditorMount}
            />
        ) : (
            <pre>{configJson}</pre>
        ))}
        <div className="config-object"></div>
        <div className="mt-4 flex justify-between">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Close</button>
          {isEditing && !isSubmitting ? (
            <div className="space-x-2">
              <button onClick={handleCancel} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded">Submit</button>
            </div>
          ) : (
            <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded">Edit</button>
          )}
        </div>
        </div>
        
    );
};

export default Config;
