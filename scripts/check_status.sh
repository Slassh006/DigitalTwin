#!/bin/bash

echo "=========================================="
echo "      DIGITAL TWIN - CLUSTER STATUS       "
echo "=========================================="

echo -e "\n[1] POD STATUS (All Nodes & Services)"
kubectl get pods -n frontend -o wide
kubectl get pods -n central-pinn -o wide
kubectl get pods -n node-imaging -o wide
kubectl get pods -n node-clinical -o wide
kubectl get pods -n node-pathology -o wide

echo -e "\n[2] SERVICE ENDPOINTS (External IPs)"
echo "--- Frontend ---"
kubectl get svc -n frontend
echo "--- Backend ---"
kubectl get svc -n central-pinn
kubectl get svc -n node-imaging
kubectl get svc -n node-clinical
kubectl get svc -n node-pathology

echo -e "\n[3] LOGS (Latest 10 lines)"
echo "--- Frontend Logs ---"
kubectl logs -n frontend -l app=frontend --tail=10
echo "--- PINN Server Logs ---"
kubectl logs -n central-pinn -l app=pinn-server --tail=10

echo -e "\n=========================================="
echo "Use 'kubectl logs -f -n <namespace> <pod-name>' to stream logs."
