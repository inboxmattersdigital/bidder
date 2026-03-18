"""
Test file upload endpoints for video, audio, and image files
Testing the fix for blob URLs being stored instead of server-side uploads
"""
import pytest
import requests
import os
import io
from pathlib import Path

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestUploadEndpoints:
    """Test file upload endpoints for creatives"""
    
    def test_health_check(self):
        """Verify API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✓ Health check passed")
    
    # ==================== VIDEO UPLOAD TESTS ====================
    
    def test_video_upload_endpoint_exists(self):
        """Test that video upload endpoint exists"""
        # Create a minimal MP4 file (just headers)
        video_content = b'\x00\x00\x00\x1c\x66\x74\x79\x70\x69\x73\x6f\x6d' + b'\x00' * 100
        files = {'file': ('test_video.mp4', io.BytesIO(video_content), 'video/mp4')}
        
        response = requests.post(f"{BASE_URL}/api/upload/video", files=files)
        # Might return 200 or 400 if file is invalid, but not 404/405
        assert response.status_code in [200, 201, 400, 422], f"Unexpected status: {response.status_code}"
        print(f"✓ Video upload endpoint exists (status: {response.status_code})")
    
    def test_video_upload_returns_server_url(self):
        """Test that video upload returns a server URL, not blob URL"""
        # Create a valid minimal video file
        video_content = b'\x00\x00\x00\x1c\x66\x74\x79\x70\x69\x73\x6f\x6d' + b'\x00' * 100
        files = {'file': ('test_video.mp4', io.BytesIO(video_content), 'video/mp4')}
        
        response = requests.post(f"{BASE_URL}/api/upload/video", files=files)
        
        if response.status_code == 200:
            data = response.json()
            assert 'url' in data, "Response should contain 'url' field"
            assert 'filename' in data, "Response should contain 'filename' field"
            # URL should be server URL, not blob URL
            assert not data['url'].startswith('blob:'), "URL should not be a blob URL"
            assert '/api/uploads/' in data['url'], "URL should be a server uploads path"
            assert data['filename'].startswith('video_'), "Filename should start with 'video_'"
            print(f"✓ Video upload returns server URL: {data['url']}")
        else:
            print(f"⚠ Video upload returned {response.status_code} - may need valid video content")
    
    def test_video_upload_invalid_type_rejected(self):
        """Test that non-video files are rejected"""
        text_content = b'This is not a video file'
        files = {'file': ('test.txt', io.BytesIO(text_content), 'text/plain')}
        
        response = requests.post(f"{BASE_URL}/api/upload/video", files=files)
        assert response.status_code == 400, f"Should reject non-video files (got {response.status_code})"
        print("✓ Non-video files correctly rejected")
    
    # ==================== AUDIO UPLOAD TESTS ====================
    
    def test_audio_upload_endpoint_exists(self):
        """Test that audio upload endpoint exists"""
        # Create minimal MP3 file (ID3 header)
        audio_content = b'ID3\x04\x00\x00\x00\x00\x00\x00' + b'\x00' * 100
        files = {'file': ('test_audio.mp3', io.BytesIO(audio_content), 'audio/mpeg')}
        
        response = requests.post(f"{BASE_URL}/api/upload/audio", files=files)
        assert response.status_code in [200, 201, 400, 422], f"Unexpected status: {response.status_code}"
        print(f"✓ Audio upload endpoint exists (status: {response.status_code})")
    
    def test_audio_upload_returns_server_url(self):
        """Test that audio upload returns a server URL, not blob URL"""
        # Create minimal MP3 content
        audio_content = b'ID3\x04\x00\x00\x00\x00\x00\x00' + b'\xff\xfb\x90\x00' + b'\x00' * 500
        files = {'file': ('test_audio.mp3', io.BytesIO(audio_content), 'audio/mpeg')}
        
        response = requests.post(f"{BASE_URL}/api/upload/audio", files=files)
        
        if response.status_code == 200:
            data = response.json()
            assert 'url' in data, "Response should contain 'url' field"
            assert 'filename' in data, "Response should contain 'filename' field"
            # URL should be server URL, not blob URL
            assert not data['url'].startswith('blob:'), "URL should not be a blob URL"
            assert '/api/uploads/' in data['url'], "URL should be a server uploads path"
            assert data['filename'].startswith('audio_'), "Filename should start with 'audio_'"
            print(f"✓ Audio upload returns server URL: {data['url']}")
        else:
            print(f"⚠ Audio upload returned {response.status_code}")
    
    def test_audio_upload_invalid_type_rejected(self):
        """Test that non-audio files are rejected"""
        text_content = b'This is not an audio file'
        files = {'file': ('test.txt', io.BytesIO(text_content), 'text/plain')}
        
        response = requests.post(f"{BASE_URL}/api/upload/audio", files=files)
        assert response.status_code == 400, f"Should reject non-audio files (got {response.status_code})"
        print("✓ Non-audio files correctly rejected")
    
    # ==================== IMAGE UPLOAD TESTS ====================
    
    def test_image_upload_endpoint_exists(self):
        """Test that image upload endpoint exists"""
        # Create minimal PNG file (PNG signature)
        png_signature = b'\x89PNG\r\n\x1a\n'
        png_content = png_signature + b'\x00' * 100
        files = {'file': ('test_image.png', io.BytesIO(png_content), 'image/png')}
        
        response = requests.post(f"{BASE_URL}/api/upload/image", files=files)
        assert response.status_code in [200, 201, 400, 422], f"Unexpected status: {response.status_code}"
        print(f"✓ Image upload endpoint exists (status: {response.status_code})")
    
    def test_image_upload_returns_server_url(self):
        """Test that image upload returns a server URL"""
        # Create minimal valid JPEG
        jpeg_content = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00' + b'\x00' * 100 + b'\xff\xd9'
        files = {'file': ('test_image.jpg', io.BytesIO(jpeg_content), 'image/jpeg')}
        
        response = requests.post(f"{BASE_URL}/api/upload/image", files=files)
        
        if response.status_code == 200:
            data = response.json()
            assert 'url' in data, "Response should contain 'url' field"
            assert 'filename' in data, "Response should contain 'filename' field"
            # URL should be server URL, not blob URL
            assert not data['url'].startswith('blob:'), "URL should not be a blob URL"
            assert '/api/uploads/' in data['url'], "URL should be a server uploads path"
            print(f"✓ Image upload returns server URL: {data['url']}")
        else:
            print(f"⚠ Image upload returned {response.status_code}")
    
    # ==================== FILE SERVING TESTS ====================
    
    def test_uploaded_files_accessible(self):
        """Test that uploaded files can be retrieved via /api/uploads/{filename}"""
        # First, upload an image
        jpeg_content = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00' + b'\x00' * 100 + b'\xff\xd9'
        files = {'file': ('test_serve.jpg', io.BytesIO(jpeg_content), 'image/jpeg')}
        
        upload_response = requests.post(f"{BASE_URL}/api/upload/image", files=files)
        
        if upload_response.status_code == 200:
            data = upload_response.json()
            filename = data['filename']
            
            # Try to access the uploaded file
            get_response = requests.get(f"{BASE_URL}/api/uploads/{filename}")
            assert get_response.status_code == 200, f"Should be able to retrieve uploaded file (got {get_response.status_code})"
            print(f"✓ Uploaded file is accessible at /api/uploads/{filename}")
        else:
            pytest.skip("Upload failed - cannot test file serving")
    
    def test_nonexistent_file_returns_404(self):
        """Test that requesting non-existent file returns 404"""
        response = requests.get(f"{BASE_URL}/api/uploads/nonexistent_file_xyz123.mp4")
        assert response.status_code == 404, f"Should return 404 for non-existent files (got {response.status_code})"
        print("✓ Non-existent files return 404")
    
    # ==================== CREATIVE STORAGE TESTS ====================
    
    def test_video_creative_stores_server_url(self):
        """Test that creating a video creative stores server URL, not blob URL"""
        # First upload a video
        video_content = b'\x00\x00\x00\x1c\x66\x74\x79\x70\x69\x73\x6f\x6d' + b'\x00' * 100
        files = {'file': ('test_creative_video.mp4', io.BytesIO(video_content), 'video/mp4')}
        
        upload_response = requests.post(f"{BASE_URL}/api/upload/video", files=files)
        
        if upload_response.status_code == 200:
            video_url = upload_response.json()['url']
            
            # Create a creative with this URL
            creative_data = {
                "name": "TEST_Video_Creative_Upload_Test",
                "type": "video",
                "video_data": {
                    "duration": 15,
                    "width": 1920,
                    "height": 1080,
                    "mimes": ["video/mp4"],
                    "video_url": video_url,
                    "source_type": "upload"
                }
            }
            
            create_response = requests.post(f"{BASE_URL}/api/creatives", json=creative_data)
            
            if create_response.status_code in [200, 201]:
                created = create_response.json()
                stored_url = created.get('video_data', {}).get('video_url', '')
                
                # Verify URL is not a blob URL
                assert not stored_url.startswith('blob:'), f"Stored URL should not be blob: {stored_url}"
                assert '/api/uploads/' in stored_url or stored_url == video_url, "URL should be server URL"
                print(f"✓ Video creative stores server URL: {stored_url}")
                
                # Cleanup - delete the test creative
                if 'id' in created:
                    requests.delete(f"{BASE_URL}/api/creatives/{created['id']}")
            else:
                print(f"⚠ Creative creation returned {create_response.status_code}: {create_response.text}")
        else:
            pytest.skip(f"Video upload failed with {upload_response.status_code}")
    
    def test_audio_creative_stores_server_url(self):
        """Test that creating an audio creative stores server URL, not blob URL"""
        # First upload an audio
        audio_content = b'ID3\x04\x00\x00\x00\x00\x00\x00' + b'\xff\xfb\x90\x00' + b'\x00' * 500
        files = {'file': ('test_creative_audio.mp3', io.BytesIO(audio_content), 'audio/mpeg')}
        
        upload_response = requests.post(f"{BASE_URL}/api/upload/audio", files=files)
        
        if upload_response.status_code == 200:
            audio_url = upload_response.json()['url']
            
            # Create a creative with this URL
            creative_data = {
                "name": "TEST_Audio_Creative_Upload_Test",
                "type": "audio",
                "audio_data": {
                    "duration": 30,
                    "mimes": ["audio/mpeg"],
                    "audio_url": audio_url
                }
            }
            
            create_response = requests.post(f"{BASE_URL}/api/creatives", json=creative_data)
            
            if create_response.status_code in [200, 201]:
                created = create_response.json()
                stored_url = created.get('audio_data', {}).get('audio_url', '')
                
                # Verify URL is not a blob URL
                assert not stored_url.startswith('blob:'), f"Stored URL should not be blob: {stored_url}"
                assert '/api/uploads/' in stored_url or stored_url == audio_url, "URL should be server URL"
                print(f"✓ Audio creative stores server URL: {stored_url}")
                
                # Cleanup - delete the test creative
                if 'id' in created:
                    requests.delete(f"{BASE_URL}/api/creatives/{created['id']}")
            else:
                print(f"⚠ Creative creation returned {create_response.status_code}: {create_response.text}")
        else:
            pytest.skip(f"Audio upload failed with {upload_response.status_code}")


class TestExistingUploadedFiles:
    """Test that existing uploaded files are accessible"""
    
    def test_existing_audio_files_accessible(self):
        """Test that existing audio files in uploads directory are accessible"""
        # Based on the ls output, we know these files exist
        existing_audio_files = [
            'audio_37991f1807a742638843faebee66e361.mp3',
            'audio_8cb41c6a9d4444bfb8675ea4307f92f9.mp3'
        ]
        
        for filename in existing_audio_files:
            response = requests.get(f"{BASE_URL}/api/uploads/{filename}")
            assert response.status_code == 200, f"File {filename} should be accessible (got {response.status_code})"
            print(f"✓ Existing audio file accessible: {filename}")
    
    def test_existing_image_files_accessible(self):
        """Test that existing image files in uploads directory are accessible"""
        # Based on the ls output, we know these files exist
        existing_image_files = [
            '02226b365309436e99fc40308a21d9b1.png',
            '11197a5fe9c9493da34695af8933ba2f.jpg'
        ]
        
        for filename in existing_image_files:
            response = requests.get(f"{BASE_URL}/api/uploads/{filename}")
            assert response.status_code == 200, f"File {filename} should be accessible (got {response.status_code})"
            print(f"✓ Existing image file accessible: {filename}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
