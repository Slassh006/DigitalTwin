"""
Federated Learning Aggregator Server (FedAvg Logic).

Simulates the Client-Server mechanism for a HIPAA-compliant federated
learning environment by handling local model weights from distributed
clinical, imaging, and pathology datasets, aggregating them using
FedAvg, and pushing the updated global model back out.
"""
import torch
import torch.nn as nn
from typing import List, Dict, OrderedDict
import logging
import copy

logger = logging.getLogger(__name__)

class FedAvgAggregator:
    def __init__(self, global_model: nn.Module):
        """
        Initializes the aggregator with the initial global server model.
        
        Args:
            global_model: The PyTorch PINN model.
        """
        self.global_model = global_model
        # Save a clean copy of the initial state
        self.global_weights = copy.deepcopy(global_model.state_dict())
        
    def aggregate_weights(self, client_weights: List[OrderedDict], client_samples: List[int]) -> OrderedDict:
        """
        Perform standard Federated Averaging (FedAvg).
        
        Weight_global = Sum(Weight_client_i * (Samples_client_i / Total_Samples))
        
        Args:
            client_weights: List of state_dicts from each client training node.
            client_samples: Number of data samples each client used for training.
            
        Returns:
            The aggregated global state_dict.
        """
        if not client_weights or not client_samples:
            logger.error("Empty client updates provided to aggregator.")
            return self.global_weights
            
        if len(client_weights) != len(client_samples):
            logger.error("Mismatch between number of weight dictionaries and sample counts.")
            raise ValueError("client_weights and client_samples must be the same length.")
        
        total_samples = sum(client_samples)
        
        # Initialize the aggregated weights with zeros
        aggregated_weights = copy.deepcopy(client_weights[0])
        for key in aggregated_weights.keys():
            aggregated_weights[key] = torch.zeros_like(aggregated_weights[key])
            
        # Perform the weighted sum
        for weights, num_samples in zip(client_weights, client_samples):
            weight_factor = num_samples / total_samples
            
            for key in weights.keys():
                # Add the weighted contribution of the client
                aggregated_weights[key] += weights[key] * weight_factor
                
        # Update internal state and apply to model
        self.global_weights = aggregated_weights
        self.global_model.load_state_dict(self.global_weights)
        
        logger.info(f"Successfully aggregated {len(client_weights)} client models (Total samples: {total_samples}).")
        
        return self.global_weights
        
    def get_global_weights(self) -> OrderedDict:
        """Returns the current global weights for distribution to clients."""
        return self.global_weights
        
    def distribute_to_clients(self, client_models: List[nn.Module]):
        """
        Simulates distributing the global weights back to local client nodes.
        In a real microservices architecture, this would involve serialization (e.g. gRPC or torch.save over API).
        """
        for i, model in enumerate(client_models):
            model.load_state_dict(self.global_weights)
            logger.debug(f"Distributed global weights to simulated client {i}.")
