package com.splitleb.app;

import static org.junit.Assert.assertEquals;

import android.content.Context;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Optional emulator/device smoke test; building an APK does not execute it. */
@RunWith(AndroidJUnit4.class)
public class AppContextTest {
    @Test
    public void installedIdentityMatchesSplitLeb() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("com.splitleb.app", context.getPackageName());
        assertEquals("SplitLeb", context.getString(R.string.app_name));
    }
}
