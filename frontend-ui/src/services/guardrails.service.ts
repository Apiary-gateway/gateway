import axios from 'axios';
import { API_BASE_URL } from './logs.service';
import {
  GetGuardrailsResponseSchema,
  SingleGuardrailSchema,
} from '../types/guardrails.types';

export const getGuardrails = async () => {
  try {
    const { data } = await axios.get(`${API_BASE_URL + 'guardrails'}`);
    const guardrails = GetGuardrailsResponseSchema.parse(data);
    return guardrails;
  } catch (error) {
    console.error('Error fetching guardrails:', error);
    throw error;
  }
};

export const addGuardrail = async (guardrailText: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL + 'guardrails'}`, {
      text: guardrailText,
    });
    console.log('response in addGuardrail', response);
    return response.data;
  } catch (error) {
    console.error('Error adding guardrail:', error);
    throw error;
  }
};

export const deleteGuardrail = async (id: string) => {
  try {
    await axios.delete(`${API_BASE_URL + 'guardrails'}/${id}`);
  } catch (error) {
    console.error('Error deleting guardrail:', error);
    throw error;
  }
};
