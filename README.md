# Final Project: Belay (a Slack clone)

Belay is a real-time chat application inspired by Slack, developed in collaboration with 
Tianyue Cong and Peiran Qin.

## Create and Activate Virtual Environment
```
python3 -m venv venv
source venv/bin/activate
```

## Install Dependencies
```
pip install -r requirements.txt
```

## Start the Backend Server
```
cd backend
flask run
```

## Start the Frontend
```
cd frontend
npm install
npm start
```

## Access the Application
The application will be available at `http://localhost:3000`.

## Technical Notes
The application uses Flask-CORS to enable secure cross-origin communication between the React frontend (port 3000) and Flask backend. This configuration allows specific HTTP methods (GET, POST, PUT, DELETE) and headers (Content-Type, Authorization) while maintaining security.
