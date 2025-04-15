#!/bin/bash

source backend/backend/bin/activate
cd backend
python app.py &
cd ../frontend
npm run dev