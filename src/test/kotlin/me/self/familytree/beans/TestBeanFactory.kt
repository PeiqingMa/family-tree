package me.self.familytree.beans

import io.micronaut.context.annotation.Factory
import io.micronaut.context.annotation.Primary
import org.neo4j.ogm.config.Configuration
import org.neo4j.ogm.drivers.embedded.driver.EmbeddedDriver
import org.neo4j.ogm.session.SessionFactory
import javax.inject.Singleton

@Factory
class TestBeanFactory {

    @Primary
    @Singleton
    fun sessionFactory(): SessionFactory {
        val packageName = this::class.qualifiedName?.let { it.substring(0, it.lastIndexOf('.')) }
        val driver = EmbeddedDriver()
        driver.configure(Configuration.Builder().build())
        return SessionFactory(driver, packageName)
    }

}
