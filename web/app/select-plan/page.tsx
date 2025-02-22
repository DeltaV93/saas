'use client';

import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import router, { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../utils/apiClient';

const stripePromise = loadStripe('your-publishable-key-here');

const SelectPlanPage = () => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { setRole } = useAuthStore();
  const router = useRouter();
  
  const plans = [
    { id: 'basic', name: 'Basic Plan', price: '$10/month' },
    { id: 'premium', name: 'Premium Plan', price: '$20/month' },
    { id: 'enterprise', name: 'Enterprise Plan', price: '$50/month' },
  ];

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
  };

  return (
    <Elements stripe={stripePromise}>
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow-md max-w-2xl w-full flex">
          {selectedPlan ? (
            <PaymentForm selectedPlan={plans.find(plan => plan.id === selectedPlan)} onBack={() => setSelectedPlan(null)} setRole={setRole} />
          ) : (
            <PlanSelection plans={plans} onSelect={handleSelectPlan} />
          )}
        </div>
      </div>
    </Elements>
  );
};

const PlanSelection = ({ plans, onSelect }: { plans: any[]; onSelect: (planId: string) => void }) => (
  <div className="w-full">
    <h2 className="text-2xl font-bold mb-6 text-center">Select a Plan</h2>
    <ul>
      {plans.map((plan) => (
        <li key={plan.id} className="mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="text-gray-600">{plan.price}</p>
            </div>
            <button
              onClick={() => onSelect(plan.id)}
              className="bg-indigo-600 text-white py-2 px-4 rounded-md"
            >
              Select
            </button>
          </div>
        </li>
      ))}
    </ul>
  </div>
);

const PaymentForm = ({ selectedPlan, onBack, setRole }: { selectedPlan: any; onBack: () => void; setRole: (role: string) => void }) => {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) {
      return;
    }
    const cardElement = elements.getElement(CardElement);
    if (cardElement) {
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });
      if (error) {
        console.error(error);
        router.push('/dashboard');
      } else {
        console.log('PaymentMethod:', paymentMethod);
        // Use apiClient to update user role based on selected plan
        const response = await apiClient('/auth/update-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: selectedPlan.id }),
        }) as Response;
        const result = await response.json();
        if (result.success) {
          // Update the user's role in the frontend state
          setRole(result.newRole);
          // Redirect to the dashboard or another page based on the new role
          router.push('/dashboard');
        } else {
          console.error('Failed to update role');
        }
      }
    }
  };

  return (
    <div className="w-full flex">
      <div className="w-1/2 pr-4">
        <h2 className="text-2xl font-bold mb-6">Payment Information</h2>
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md">
          <CardElement className="mb-4 px-3 py-2 mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          <button type="submit" className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md">Pay</button>
        </form>
      </div>
      <div className="w-1/2 pl-4">
        <h2 className="text-2xl font-bold mb-6">Plan Details</h2>
        <h3 className="text-lg font-semibold">{selectedPlan.name}</h3>
        <p className="text-gray-600">{selectedPlan.price}</p>
        <button onClick={onBack} className="mt-4 bg-gray-300 text-gray-700 py-2 px-4 rounded-md">Back</button>
      </div>
    </div>
  );
};

export default SelectPlanPage; 