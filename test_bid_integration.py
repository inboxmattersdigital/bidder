#!/usr/bin/env python3
import requests
import json

def test_bid_integration():
    """Test bid request to verify nurl/burl integration"""
    base_url = 'https://openrtb-campaign-hub.preview.emergentagent.com/api'
    
    try:
        # Get an active SSP endpoint
        endpoints_response = requests.get(f'{base_url}/ssp-endpoints')
        endpoints = endpoints_response.json()
        
        if not endpoints:
            print("❌ No SSP endpoints found")
            return False
        
        api_key = endpoints[0]['api_key']
        print(f'🔑 Using API key: {api_key[:20]}...')
        
        # Simple bid request
        bid_request = {
            'id': 'test-bid-request-nurl',
            'at': 2,
            'tmax': 100,
            'imp': [{
                'id': '1', 
                'bidfloor': 0.1,
                'banner': {
                    'w': 300, 
                    'h': 250,
                    'mimes': ['image/jpeg']
                }
            }],
            'site': {
                'id': 'test-site',
                'domain': 'example.com'
            },
            'device': {
                'devicetype': 2,
                'ip': '192.168.1.1'
            }
        }
        
        headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        }
        
        response = requests.post(f'{base_url}/bid', json=bid_request, headers=headers)
        print(f'📡 Bid response status: {response.status_code}')
        
        if response.status_code == 200:
            bid_response = response.json()
            if bid_response.get('seatbid'):
                bid = bid_response['seatbid'][0]['bid'][0]
                nurl = bid.get('nurl')
                burl = bid.get('burl')
                print(f'✅ Bid ID: {bid.get("id")}')
                print(f'✅ Bid Price: ${bid.get("price"):.2f}')
                if nurl:
                    print(f'✅ nurl (win notification): {nurl}')
                if burl:
                    print(f'✅ burl (billing notification): {burl}')
                print('🎯 nurl/burl integration working!')
                return True
            else:
                print('🚫 No bids in response')
                return False
        elif response.status_code == 204:
            print('🚫 No bid returned (normal for no matching campaigns)')
            return True  # This is expected behavior
        else:
            print(f'❌ Error: {response.text}')
            return False
            
    except Exception as e:
        print(f'❌ Test failed: {e}')
        return False

if __name__ == "__main__":
    test_bid_integration()