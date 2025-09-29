import random

def get_channel_message():
    channels = [
        {"channel": "email", "message": "Special offer via email!"},
        {"channel": "sms", "message": "Exclusive SMS offer!"},
        {"channel": "whatsapp", "message": "Exclusive offer on WhatsApp!"},
        {"channel": "ads", "message": "Targeted ads just for you!"}
    ]
    return random.choice(channels)
