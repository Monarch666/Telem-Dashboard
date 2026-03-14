import asyncio
import websockets
import json
import argparse
import sys
from pymavlink import mavutil

# Set of connected WebSocket clients
connected_clients = set()

async def handler(websocket):
    """Handles incoming WebSocket connections and registers them."""
    connected_clients.add(websocket)
    client_addr = websocket.remote_address
    print(f"Client connected from {client_addr}! Total clients: {len(connected_clients)}")
    try:
        # Keep connection open until client disconnects
        await websocket.wait_closed()
    except Exception as e:
        print(f"Error handling client {client_addr}: {e}")
    finally:
        connected_clients.remove(websocket)
        print(f"Client disconnected ({client_addr}). Total clients: {len(connected_clients)}")

import serial.tools.list_ports
import time

async def mavlink_poller(baud_rate):
    """Continuously polls for a Pixhawk and broadcasts MAVLink data."""
    print("Starting auto-connect MAVLink polling loop...")
    
    while True:
        # 1. Scan for COM ports
        ports = serial.tools.list_ports.comports()
        connected_port = None
        for port, desc, hwid in sorted(ports):
            # Try to connect to any available port
            print(f"Trying port {port} ({desc})...")
            try:
                # Test connection (briefly open to check if it's valid)
                vehicle = mavutil.mavlink_connection(port, baud=baud_rate)
                
                # Check for heartbeat briefly (non-blocking)
                msg = vehicle.recv_match(type='HEARTBEAT', blocking=True, timeout=2)
                if msg:
                    connected_port = port
                    print(f"✅ Success! Connected to Pixhawk on {port} at {baud_rate} baud.")
                    # Request all data streams at 10 Hz
                    vehicle.mav.request_data_stream_send(
                        vehicle.target_system, vehicle.target_component,
                        mavutil.mavlink.MAV_DATA_STREAM_ALL, 10, 1
                    )
                    break
                else:
                    vehicle.close()
            except Exception as e:
                # Port might be in use or not a Pixhawk
                pass
                
        if not connected_port:
            print("No Pixhawk detected. Retrying in 3 seconds...")
            await asyncio.sleep(3)
            continue
            
        # 2. Read loop once connected
        loss_counter = 0
        while True:
            try:
                # Non-blocking read
                msg = vehicle.recv_match(blocking=False)
                if msg:
                    loss_counter = 0 # reset on successful message
                    msg_type = msg.get_type()
                    if msg_type != 'BAD_DATA':
                        msg_dict = msg.to_dict()
                        try:
                            payload = json.dumps({
                                "type": msg_type,
                                "data": msg_dict
                            })
                            
                            # Broadcast to all connected clients
                            if connected_clients:
                                websockets.broadcast(connected_clients, payload)
                        except TypeError:
                            pass
                else:
                    loss_counter += 1
                    if loss_counter > 2000: # ~10 seconds of no data at 0.005s yield
                        print("Connection lost! Attempting to reconnect...")
                        vehicle.close()
                        break # Break inner loop to trigger rescan
                        
                    # No data ready, yield control back to the event loop
                    await asyncio.sleep(0.005)
            except Exception as e:
                print(f"Error reading from {connected_port}: {e}")
                try: vehicle.close()
                except: pass
                break # Break inner loop to trigger rescan

async def main():
    parser = argparse.ArgumentParser(description="MAVLink to WebSocket Bridge")
    parser.add_argument("--baud", type=int, default=57600, help="Baud rate (default: 57600)")
    parser.add_argument("--ws-port", type=int, default=8765, help="WebSocket server port (default: 8765)")
    args = parser.parse_args()

    # Start WebSocket server
    print(f"Starting WebSocket server on ws://localhost:{args.ws_port}...")
    try:
        server = await websockets.serve(handler, "localhost", args.ws_port)
    except Exception as e:
        print(f"Failed to start WebSocket server: {e}")
        sys.exit(1)

    # Start polling MAVLink in the background (will infinite loop and auto-reconnect)
    poll_task = asyncio.create_task(mavlink_poller(args.baud))

    # Keep server running
    await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nShutting down Server...")
        sys.exit(0)
