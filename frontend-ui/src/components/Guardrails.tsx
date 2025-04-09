import { useState, useEffect } from 'react';
import {
  getGuardrails,
  addGuardrail,
  deleteGuardrail,
} from '../services/guardrails.service';

interface GuardrailsProps {
  onClose: () => void;
}

const Guardrails = ({ onClose }: GuardrailsProps) => {
  const [guardrails, setGuardrails] = useState<{ id: string; text: string }[]>(
    []
  );
  const [newGuardrail, setNewGuardrail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    const fetchGuardrails = async () => {
      try {
        const data = await getGuardrails();
        setGuardrails(data);
        setNewGuardrail('');
      } catch (err) {
        setNotification({
          type: 'error',
          message: 'Failed to fetch guardrails',
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchGuardrails();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleAddGuardrail = async () => {
    if (!newGuardrail.trim()) return;

    if (!window.confirm('Are you sure you want to add this guardrail?')) {
      return;
    }

    setIsProcessing(true);
    try {
      const newGuardrailFromAPI = await addGuardrail(newGuardrail.trim());
      setGuardrails([...guardrails, newGuardrailFromAPI]);
      setNewGuardrail('');
      setNotification({
        type: 'success',
        message: 'Guardrail added successfully',
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Failed to add guardrail',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteGuardrail = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this guardrail?')) {
      return;
    }

    setIsProcessing(true);
    try {
      await deleteGuardrail(id);
      const updatedGuardrails = await getGuardrails();
      setGuardrails(updatedGuardrails);
      setNotification({
        type: 'success',
        message: 'Guardrail deleted successfully',
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Failed to delete guardrail',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="guardrails-container">
      <h2>Guardrails</h2>
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
      {(isLoading || isProcessing) && (
        <div className="modal-loading-overlay">
          <div className="spinner"></div>
        </div>
      )}
      <div className="guardrails-list">
        {guardrails.map((guardrail) => (
          <div key={guardrail.id} className="guardrail-item">
            <span className="guardrail-text">{guardrail.text}</span>
            <button
              onClick={() => handleDeleteGuardrail(guardrail.id)}
              className="delete-button"
              disabled={isLoading || isProcessing}
              title="Delete guardrail"
            >
              <svg
                className="trash-icon"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <div className="add-guardrail">
        <input
          type="text"
          value={newGuardrail}
          onChange={(e) => setNewGuardrail(e.target.value)}
          placeholder="Add new guardrail"
          className="guardrail-input"
          disabled={isLoading || isProcessing}
        />
        <button
          onClick={handleAddGuardrail}
          className="add-button"
          disabled={isLoading || isProcessing}
        >
          Add
        </button>
      </div>
    </div>
  );
};

export default Guardrails;
