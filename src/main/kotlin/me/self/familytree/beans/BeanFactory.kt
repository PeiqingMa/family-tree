package me.self.familytree.beans

import io.micronaut.context.annotation.Factory
import org.neo4j.driver.Driver
import org.neo4j.ogm.drivers.bolt.driver.BoltDriver
import org.neo4j.ogm.session.SessionFactory
import javax.inject.Inject
import javax.inject.Singleton

@Factory
class BeanFactory {

    @Singleton
    @Inject
    fun sessionFactory(driver: Driver): SessionFactory {
        val packageName = this::class.qualifiedName?.let { it.substring(0, it.lastIndexOf('.')) }
        return SessionFactory(BoltDriver(driver), packageName)
    }

}
