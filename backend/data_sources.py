import random

def get_data_sources():
    gtm_data = {
        "page_view": "/product/xyz",
        "user_behavior": random.choice(["abandoned_cart", "page_viewed"])
    }

    facebook_pixel_data = {
        "event": "purchase",
        "value": random.choice([100, 200, 300])
    }

    google_ads_data = {
        "campaign": "product_launch",
        "conversion": random.choice([0, 1])
    }

    return {
        "gtm": gtm_data,
        "facebook_pixel": facebook_pixel_data,
        "google_ads_tag": google_ads_data
    }
