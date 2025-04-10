import { useState, useEffect } from 'react';
import {
    getConfig,
    submitConfig,
} from '../services/config.service';
import Editor from '@monaco-editor/react';

interface ConfigProps {
  onClose: () => void;
}

const Config = ({ onClose }: ConfigProps) => {
    const [configJson, setConfigJson] = useState<string>('');
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notification, setNotification] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

    useEffect(() => {
        const fetchConfig = async () => {
        try {
            const data = await getConfig();
            setConfigJson(JSON.stringify(data, null, 2));
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

    const handleSubmit = async () => {
        setIsEditing(false);
        setIsSubmitting(true);
        setNotification(null);
        try {
            await submitConfig(configJson);
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

    return (
        <div className="config-container">
        <h2>Manage Configuration Object</h2>
        {notification && (
            <div className={`notification ${notification.type}`}>
            {notification.message}
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
            defaultValue={configJson}
            onChange={(value) => setConfigJson(value || '')}
            />
        ) : (
            <pre>{configJson}</pre>
        ))}
        <div className="config-object"></div>
        <div className="mt-4 flex justify-between">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Close</button>
          {isEditing && !isSubmitting ? (
            <div className="space-x-2">
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
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
